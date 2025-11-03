import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthTodoUserLogin(props: {
  body: ITodoAppTodoUser.ILogin;
}): Promise<ITodoAppTodoUser.IAuthorized> {
  const { body } = props;

  // 1) Find user by email
  const user = await MyGlobal.prisma.todo_app_todouser.findFirst({
    where: { email: body.email },
  });
  if (!user) {
    // Do not reveal which part failed
    throw new HttpException("Invalid credentials", 401);
  }

  // 2) Lockout policy: 5 failed attempts within 15 minutes
  if (
    user.failed_login_attempts >= 5 &&
    user.last_failed_login_at &&
    Date.now() - user.last_failed_login_at.getTime() < 15 * 60 * 1000
  ) {
    throw new HttpException(
      "Account temporarily locked due to multiple failed login attempts",
      403,
    );
  }

  // 3) Account status checks
  if (user.status === "suspended") {
    throw new HttpException("Account is suspended", 403);
  }
  if (!user.is_verified) {
    throw new HttpException("Please verify your email first", 403);
  }

  // 4) Password verification
  const isValid = await PasswordUtil.verify(body.password, user.password_hash);
  if (!isValid) {
    await MyGlobal.prisma.todo_app_todouser.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: user.failed_login_attempts + 1,
        last_failed_login_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  // 5) MFA handling: cannot verify here because ILogin has no MFA token field
  //    – require client to perform MFA step if account has MFA enabled
  if (user.mfa_enabled) {
    throw new HttpException("Multi-factor authentication required", 401);
  }

  // 6) Reset failed attempts after successful authentication
  await MyGlobal.prisma.todo_app_todouser.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      last_failed_login_at: null,
    },
  });

  // 7) Create session and tokens
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const session = await MyGlobal.prisma.todo_app_todouser_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_app_todouser_id: user.id,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: toISOStringSafe(new Date()),
      expired_at: accessExpires,
    },
  });

  const access = jwt.sign(
    {
      type: "todouser",
      id: user.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    {
      type: "todouser",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 8) Build and return response mapping null/undefined correctly
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? null,
    is_verified: user.is_verified,
    status: user.status,
    mfa_enabled: user.mfa_enabled,
    createdAt: toISOStringSafe(user.created_at),
    updatedAt: toISOStringSafe(user.updated_at),
    deletedAt: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
    user: {
      id: user.id,
      displayName: user.display_name ?? null,
      isVerified: user.is_verified,
      status: user.status,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
    },
  };
}
