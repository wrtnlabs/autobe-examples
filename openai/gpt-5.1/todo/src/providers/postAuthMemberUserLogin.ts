import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberUserLogin(props: {
  body: ITodoAppMemberUserLogin.IRequest;
}): Promise<ITodoAppMemberuser.IAuthorized> {
  const email = props.body.email;

  // Look up member user by unique email
  const member = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: { email },
  });

  // Capture current time once for this request context
  const nowDate = new Date();
  const now = toISOStringSafe(nowDate);

  // If user not found, perform dummy verification to avoid user enumeration
  if (!member) {
    // Use a constant dummy hash so verification work is still performed
    const dummyHash =
      "$2b$10$0123456789abcdef0123uQ2F1tMXhQxYv3S9YpQfZbQh3pQxZ0y6";
    try {
      await PasswordUtil.verify(props.body.password, dummyHash);
    } catch {
      // Intentionally ignore errors from dummy verification
    }
    throw new HttpException("Invalid credentials", 401);
  }

  // Enforce account status: only allowed statuses may log in (treat non-active as blocked)
  if (member.status !== "active") {
    throw new HttpException("Account is not allowed to login", 403);
  }

  // Verify password against stored hash
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );

  if (!passwordValid) {
    // On failure: increment failed_login_count and touch updated_at, then return generic error
    await MyGlobal.prisma.todo_app_memberusers.update({
      where: { id: member.id },
      data: {
        failed_login_count: member.failed_login_count + 1,
        updated_at: nowDate,
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  // Successful authentication: reset failed_login_count and update last_login_at / updated_at
  const updatedMember = await MyGlobal.prisma.todo_app_memberusers.update({
    where: { id: member.id },
    data: {
      failed_login_count: 0,
      last_login_at: nowDate,
      updated_at: nowDate,
    },
  });

  // Compute access and refresh expirations
  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000); // +1 hour
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // +7 days

  const accessExpires = toISOStringSafe(accessExpiresDate);
  const refreshExpires = toISOStringSafe(refreshExpiresDate);

  // Create a new session for this login
  const sessionId = v4();

  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.create({
    data: {
      id: sessionId,
      todo_app_memberuser_id: updatedMember.id,
      ip:
        props.body.ip === null || props.body.ip === undefined
          ? ""
          : props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowDate,
      expired_at: accessExpiresDate,
    },
  });

  const tokenCreatedAt = now;

  const accessToken = jwt.sign(
    {
      type: "memberuser",
      id: updatedMember.id,
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
      type: "memberuser",
      id: updatedMember.id,
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
    id: updatedMember.id,
    email: updatedMember.email,
    display_name:
      updatedMember.display_name === null ? null : updatedMember.display_name,
    status: updatedMember.status,
    failed_login_count: updatedMember.failed_login_count,
    last_login_at:
      updatedMember.last_login_at === null
        ? null
        : toISOStringSafe(updatedMember.last_login_at),
    created_at: toISOStringSafe(updatedMember.created_at),
    updated_at: toISOStringSafe(updatedMember.updated_at),
    deleted_at:
      updatedMember.deleted_at === null
        ? null
        : toISOStringSafe(updatedMember.deleted_at),
    token,
  };
}
