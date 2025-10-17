import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberLogin";
import { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";
import { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IMemberLogin.IRequest;
}): Promise<ITodoMember.IAuthorized> {
  const { email, password } = props.body;

  // Find member by email
  const member = await MyGlobal.prisma.todo_member.findUnique({
    where: { email },
  });

  if (!member) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Check if account is locked
  if (
    member.locked_until &&
    toISOStringSafe(member.locked_until) > toISOStringSafe(new Date())
  ) {
    throw new HttpException(
      "Account is temporarily locked due to excessive failed login attempts",
      423,
    );
  }

  // Verify password using PasswordUtil
  const isValidPassword = await PasswordUtil.verify(
    password,
    member.password_hash,
  );

  if (!isValidPassword) {
    // Update failed login attempts
    const updatedAttempts = member.login_attempts + 1;
    const shouldLock = updatedAttempts >= 5;

    await MyGlobal.prisma.todo_member.update({
      where: { id: member.id },
      data: {
        login_attempts: updatedAttempts,
        locked_until: shouldLock
          ? toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000))
          : null,
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  // Reset login attempts on successful login
  const currentTime = toISOStringSafe(new Date());
  await MyGlobal.prisma.todo_member.update({
    where: { id: member.id },
    data: {
      login_attempts: 0,
      locked_until: null,
      last_login_at: currentTime,
    },
  });

  // Generate JWT tokens with MemberPayload structure
  const accessToken = jwt.sign(
    {
      id: member.id,
      email: member.email,
      role: member.role,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: member.id,
      email: member.email,
      role: member.role,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const now = new Date();
  const accessExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: member.id,
    email: member.email,
    role: member.role as IETodoRole,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    last_login_at: currentTime,
  };
}
