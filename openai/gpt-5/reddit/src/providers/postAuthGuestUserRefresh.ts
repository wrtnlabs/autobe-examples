import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestUserRefresh(props: {
  body: ICommunityPlatformGuestUser.IRefresh;
}): Promise<ICommunityPlatformGuestUser.IAuthorized> {
  const { body } = props;

  // 1) Verify and decode refresh token
  let decoded: jwt.JwtPayload;
  try {
    const payload = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
    if (typeof payload !== "object" || payload === null) {
      throw new HttpException("Invalid refresh token payload", 401);
    }
    decoded = payload as jwt.JwtPayload;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2) Extract subject (user id) and validate token semantics
  const tokenUserId = (decoded as Record<string, unknown>)["id"];
  const tokenType = (decoded as Record<string, unknown>)["tokenType"];
  const tokenRole = (decoded as Record<string, unknown>)["type"];

  if (typeof tokenUserId !== "string")
    throw new HttpException("Invalid token subject", 401);
  if (tokenRole !== undefined && tokenRole !== "guestuser")
    throw new HttpException("Token role not permitted for guest refresh", 403);
  if (tokenType !== undefined && tokenType !== "refresh")
    throw new HttpException("Invalid refresh token type", 401);

  // 3) Load user and validate state
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: tokenUserId },
  });
  if (!user) throw new HttpException("User not found", 404);

  // Disallowed states
  const blockedStates = new Set([
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
    "Banned",
  ]);
  if (blockedStates.has(user.account_state))
    throw new HttpException("Account state does not allow refresh", 403);
  if (!user.email_verified) throw new HttpException("Email not verified", 403);
  if (user.deleted_at !== null) throw new HttpException("Account deleted", 403);

  // 4) Ensure active guest assignment (revoked_at IS NULL and not soft-deleted)
  const guestAssignment =
    await MyGlobal.prisma.community_platform_guest_users.findFirst({
      where: {
        community_platform_user_id: user.id,
        revoked_at: null,
        deleted_at: null,
      },
    });
  if (!guestAssignment)
    throw new HttpException("Guest role is not active", 403);

  // 5) Update last_login_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_users.update({
    where: { id: user.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // 6) Issue tokens
  const accessTtlSeconds = 60 * 60; // 1 hour
  const refreshTtlSeconds = 60 * 60 * 24 * 7; // 7 days

  const access = jwt.sign(
    {
      id: user.id,
      type: "guestuser",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTtlSeconds,
      issuer: "autobe",
    },
  );

  // Policy: do not rotate refresh token (stable token)
  const refresh = body.refresh_token;

  const expired_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + accessTtlSeconds * 1000),
  );
  const refreshable_until: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + refreshTtlSeconds * 1000),
  );

  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at,
    refreshable_until,
  };

  return {
    id: user.id as string & tags.Format<"uuid">,
    token,
    role: "guestUser",
  };
}
