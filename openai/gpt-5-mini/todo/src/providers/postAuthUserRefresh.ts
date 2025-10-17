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

export async function postAuthUserRefresh(props: {
  body: ITodoAppUser.IRefresh;
}): Promise<ITodoAppUser.IAuthorized> {
  const { body } = props;
  const { refreshToken } = body;

  let decoded: unknown;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Extract user identifier from token payload
  const tokenAny = decoded as Record<string, unknown> | undefined;
  const userId =
    (tokenAny && (tokenAny["userId"] as string)) ??
    (tokenAny && (tokenAny["sub"] as string)) ??
    (tokenAny && (tokenAny["id"] as string));

  if (!userId) throw new HttpException("Invalid token payload", 401);

  const user = await MyGlobal.prisma.todo_app_user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Not Found", 404);
  if (user.account_status === "suspended")
    throw new HttpException("Account suspended", 403);

  // Prepare timestamps
  const now = toISOStringSafe(new Date());
  const accessTtlMs = 60 * 60 * 1000; // 1 hour
  const refreshTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Persist activity timestamps
  await MyGlobal.prisma.todo_app_user.update({
    where: { id: user.id },
    data: {
      last_active_at: now,
      updated_at: now,
    },
  });

  // Issue tokens with same payload shape as login (id + type)
  const accessPayload = { id: user.id, type: "user" };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refresh = jwt.sign(
    { userId: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expired_at = toISOStringSafe(new Date(Date.now() + accessTtlMs));
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshTtlMs),
  );

  const response: ITodoAppUser.IAuthorized = {
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? null,
    account_status: user.account_status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: now,
    last_active_at: user.last_active_at
      ? toISOStringSafe(user.last_active_at)
      : null,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name ?? null,
      account_status: user.account_status,
      created_at: toISOStringSafe(user.created_at),
      last_active_at: user.last_active_at
        ? toISOStringSafe(user.last_active_at)
        : null,
    },
  };

  return response;
}
