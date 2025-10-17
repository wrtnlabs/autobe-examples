import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ITodoAppUser.ILogin;
}): Promise<ITodoAppUser.IAuthorized> {
  const { body } = props;
  const { email, password } = body;

  // Retrieve user by email
  const user = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { email },
  });

  // Generic failure to avoid account enumeration
  if (!user || !user.password_hash) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Deny suspended accounts
  if (user.account_status === "suspended") {
    throw new HttpException("Account suspended", 403);
  }

  // Compute token expiry moments once for consistency
  const accessExpiryAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpired_at = toISOStringSafe(accessExpiryAt);
  const refreshable_until = toISOStringSafe(refreshExpiryAt);

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { userId: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update last activity timestamps and return selected fields
  const updated = await MyGlobal.prisma.todo_app_user.update({
    where: { id: user.id },
    data: {
      last_active_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      account_status: true,
      created_at: true,
      updated_at: true,
      last_active_at: true,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name ?? null,
    account_status: updated.account_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    last_active_at: updated.last_active_at
      ? toISOStringSafe(updated.last_active_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpired_at,
      refreshable_until,
    },
    user: {
      id: updated.id,
      email: updated.email,
      display_name: updated.display_name ?? null,
      account_status: updated.account_status,
      created_at: toISOStringSafe(updated.created_at),
      last_active_at: updated.last_active_at
        ? toISOStringSafe(updated.last_active_at)
        : null,
    },
  };
}
