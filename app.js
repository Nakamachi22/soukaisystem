//諸々の必要記述
const express = require('express');
const app = express();
const mysql = require('mysql');
const bcrypt = require('bcrypt');
app.use(express.static('public'));
//下一行はフォームの値を受け取るために必須
app.use(express.urlencoded({extended: false}));
const session = require('express-session');
//データベースへの接続
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '自分の設定したパスワードでご利用ください',
    database: '自分で作成したデータベースをご利用ください'
});
//sessionの利用に必要な呪文
app.use(
    session({
        secret: 'my_secret_key',
        resave: false,
        saveUninitialized: false,
    })
)
//セッション管理
app.use((req, res, next) => {
    if(req.session.userId === undefined){
        console.log('ログインしていません');
        res.locals.username= 'ゲスト';
        res.locals.isLoggedIn = false;
    }else{
        console.log("ログインしています")
        res.locals.username = req.session.username;
        res.locals.isLoggedIn = true;
    }
    next();
})
//ログイン画面
app.get('/', (req,res) => {
    res.render('entrance.ejs');
});
app.get('/list', (req,res) => {
    res.render('list.ejs');
});
//ログインをするときの動作
app.post('/login', (req,res) => {
    const number = req.body.number;
    connection.query(
        'SELECT * FROM users WHERE number = ?',
        [number],
        (error, results) => {
            if(results.length > 0){
                const plain = req.body.password;
                const hash = results[0].password;
                bcrypt.compare(plain, hash, (error, isEqual) => {
                    if(isEqual){
                            req.session.userId = results[0].id;
                            req.session.username = results[0].username;
                            res.redirect('/list');
                    }else{
                        res.redirect('/')
                    }
                });
            }else{
                res.redirect('/');
            }
        }
    );
});

//
app.get('/index', (req,res) => {
    connection.query(
        'SELECT * FROM users',
        (error, results) =>{
            console.log(results);
            res.render('index.ejs', {users: results});
        }
    )
});
//新規登録画面のルーディングと処理
app.get('/signup', (req, res) => {
    res.render('signup.ejs', {errors: []});
});
app.post('/signup',
    (req,res,next) => {
        console.log('入力値の空チェック');
        const username =req.body.username;
        const number = req.body.number;
        const password = req.body.password;
        const errors = [];
        if(username === ''){
            errors.push('ユーザー名が空です');
        }
        if(number === ''){
            errors.push('メールアドレスが空です');
        }
        if(password === ''){
            errors.push('パスワードが空です');
        }
        console.log(errors);
        if(errors.length > 0){
            res.render('signup.ejs', {errors: errors});
        }else{
            next();
        }
    },
    (req, res, next) => {
        console.log('学籍番号の重複チェック');
        const number = req.body.number;
        const errors = [];
        connection.query(
            'SELECT * FROM users WHERE number = ?',
            [number],
            (error, results) => {
                if(results.length > 0){
                    errors.push('その学籍番号はすでに登録済みです');
                    res.render('signup.ejs',{errors: errors});
                }else{
                    next();
                }
            }
        );
    },
    (req, res) => {
        const username = req.body.username;
        const number = req.body.number;
        const password = req.body.password;
        パスワードをハッシュ化する処理
        bcrypt.hash(password, 10, (error, hash) => {
        connection.query(
            'INSERT INTO users (username, number, password) VALUES(?, ?, ?)',
            [username, number, password],
            (error, results) => {
                req.session.userId = results.insertId;
                req.session.username = username;
                res.redirect('/list');
            }
        );
        });
    }
);
//ログアウトのルーディングと処理
app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        res.redirect('/');
    });
});

//黒板
app.get('/memo', (req,res) => {
    connection.query('SELECT * FROM discussions JOIN bills ON discussions.bills_id = bills.id',
    (error,results) => {
        res.render('memo.ejs', {discussions: results});
    });
});
//投稿作成
app.get('/write', (req, res) => {
    res.render('write.ejs');
});
app.post('/write', (req, res) => {
    const r_grade = req.body.rgrade;
    const r_kind = req.body.rkind;
    const r_name = req.body.rname;
    const r_content = req.body.rcontent;
    //const bill_id 
    connection.query(
        'INSERT INTO discussions (rgrade, rkind, rname, rcontent) VALUES(?, ?, ?, ?)',
        [r_grade, r_kind, r_name, r_content],
        (error,results) => {
            res.redirect('/write');
        }
    );
});
//発言投稿管理のルーティングと処理
app.get('/controlwrite', (req, res) => {
    connection.query('SELECT * FROM discussions JOIN bills ON discussions.bills_id = bills.id',
    (error, results) => {
        res.render('controlwrite.ejs', {discussions: results});
    });
});
app.post('/delete/:id', (req,res) => {
    //内容を削除
    connection.query(
        'DELETE FROM discussions WHERE id = ?',
        [req.params.id],
        (error,results) => {
            res.redirect('/controlwrite');
        }
    );
});

//編集画面へのルーディング
app.get('/edit/:id', (req,res) => {
    connection.query(
        'SELECT * FROM discussions WHERE id = ?',
        [req.params.id],
        (error, results) =>{
            res.render('edit.ejs', {discuss: results[0]});
        }
    );
});
//編集(更新)のルーディングと処理
app.post('/update/:id', (req, res) => {
    connection.query(
        'UPDATE discussions SET rcontent = ? WHERE id = ?',
        [req.body.discussrcontent, req.params.id],
        (error, results) => {
          res.redirect('/controlwrite');
        }  
      );
});
//議案入力へのルーディング
app.get('/enterbill', (req, res) => {
    res.render('enterbill.ejs');
});
app.post('/create', (req, res) => {
    const billname = req.body.billname;
    const pname = req.body.pname;
    const pgrade = req.body.pgrade;
    const pkind = req.body.pkind;
    connection.query(
        'INSERT INTO bills (billname, pname, pgrade, pkind) VALUES(?, ?, ?, ?)',
        [billname, pname, pgrade,pkind],
        (error, results) => {
            res.redirect('/enterbill');
        }
    );
});
//議案選択へのルーディング
app.get('/choosebills', (req,res) => {
    connection.query(
        'SELECT * FROM bills',
        (error, results) => {
            res.render('choosebills.ejs', {bills: results});
        }
    );
});





app.listen(3001);
