import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

// 强制使用Node.js runtime以支持bcrypt
export const runtime = 'nodejs';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const { password, hashedPassword, email, name, isRegister } = await request.json();
    
    // 如果只是验证密码
    if (password && hashedPassword && !email) {
      const isValid = await bcrypt.compare(password, hashedPassword);
      return NextResponse.json({ valid: isValid });
    }
    
    // 原有的注册/登录逻辑

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    // 密码强度验证
    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码长度至少需要6位字符" },
        { status: 400 }
      );
    }

    if (isRegister === "true") {
      // 注册逻辑
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { error: "请输入您的姓名" },
          { status: 400 }
        );
      }

      if (name.trim().length < 2) {
        return NextResponse.json(
          { error: "姓名至少需要2个字符" },
          { status: 400 }
        );
      }

      // 检查用户是否已存在
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;
      if (existingUser.length > 0) {
        return NextResponse.json(
          { error: "该邮箱已被其他用户注册，请使用其他邮箱或直接登录" },
          { status: 400 }
        );
      }

      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await sql`
        INSERT INTO users (email, name, password_hash)
        VALUES (${email}, ${name.trim()}, ${hashedPassword})
        RETURNING id, email, name, image
      `;

      if (!newUser || newUser.length === 0) {
        return NextResponse.json(
          { error: "注册失败，请稍后重试" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          name: newUser[0].name,
          image: newUser[0].image
        }
      });
    } else {
      // 登录逻辑
      const user = await sql`
        SELECT id, email, name, image, password_hash 
        FROM users 
        WHERE email = ${email}
      `;

      if (user.length === 0) {
        return NextResponse.json(
          { error: "该邮箱尚未注册，请先注册账户或检查邮箱是否正确" },
          { status: 400 }
        );
      }

      if (!password) {
        return NextResponse.json(
          { error: "请输入密码" },
          { status: 400 }
        );
      }

      if (!user[0].password_hash) {
        return NextResponse.json(
          { error: "该账号尚未设置密码，请通过原登录方式或重置密码后再试" },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(password, user[0].password_hash);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: "密码错误，请检查密码是否正确" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          image: user[0].image
        }
      });
    }
  } catch (error) {
    console.error("认证API错误:", error);
    
    // 数据库连接错误
    if (error instanceof Error && error.message.includes('database')) {
      return NextResponse.json(
        { error: "系统暂时不可用，请稍后重试" },
        { status: 500 }
      );
    }
    
    // 网络错误
    if (error instanceof Error && (error.message.includes('network') || error.message.includes('timeout'))) {
      return NextResponse.json(
        { error: "网络连接异常，请检查网络后重试" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
