import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminJoin";
import { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoAdminJoin(props: {
  body: ITodoAppTodoAdminJoin.IRequest;
}): Promise<ITodoAppTodoAdmin.IAuthorized> {
  const password = props.body.password;

  // Business-level password policy: at least 8 chars, must contain letters and numbers.
  const hasMinimumLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasMinimumLength || !hasLetter || !hasNumber) {
    throw new HttpException(
      "Password does not meet complexity requirements",
      400,
    );
  }

  // Pre-check for existing admin with same email to provide deterministic conflict error.
  const existingAdmin = await MyGlobal.prisma.todo_app_todoadmins.findFirst({
    where: { email: props.body.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Current timestamp as ISO string.
  const now = toISOStringSafe(new Date());

  // Compute expiration timestamps for access and refresh tokens.
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const adminId = v4();

  try {
    // Create admin account with hashed password.
    const passwordHash = await PasswordUtil.hash(password);

    const admin = await MyGlobal.prisma.todo_app_todoadmins.create({
      data: {
        id: adminId,
        email: props.body.email,
        password_hash: passwordHash,
        display_name:
          props.body.displayName === undefined ? null : props.body.displayName,
        status: "active",
        last_login_at: null,
        created_at: now,
        updated_at: now,
      },
    });

    // Create initial admin session.
    const sessionId = v4();

    const session = await MyGlobal.prisma.todo_app_todoadmin_sessions.create({
      data: {
        id: sessionId,
        todo_app_todoadmin_id: admin.id,
        // Prisma column expects non-nullable string, so normalize nullable ip into string.
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
    });

    const tokenCreatedAt = now;

    const accessToken = jwt.sign(
      {
        type: "todoAdmin",
        id: admin.id,
        session_id: session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    const refreshToken = jwt.sign(
      {
        type: "todoAdmin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );

    const token: IAuthorizationToken = {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    };

    return {
      id: admin.id,
      email: admin.email,
      display_name: admin.display_name,
      status: admin.status,
      // ITodoAppTodoAdmin.IAuthorized expects (string & Format<"date-time">) | null | undefined
      // while Prisma field is Date | null; convert non-null Date via toISOStringSafe.
      last_login_at:
        admin.last_login_at === null
          ? null
          : toISOStringSafe(admin.last_login_at as unknown as Date),
      // created_at / updated_at are Date in Prisma and string & Format<"date-time"> in DTO.
      created_at: toISOStringSafe(admin.created_at as unknown as Date),
      updated_at: toISOStringSafe(admin.updated_at as unknown as Date),
      token,
    };
  } catch (error) {
    // Handle possible race-condition unique constraint violation.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Email already registered", 409);
    }

    throw error;
  }
}
