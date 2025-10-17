import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityModeratorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorRefresh";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityModeratorRefresh(props: {
  body: ICommunityPlatformCommunityModeratorRefresh.IRequest;
}): Promise<ICommunityPlatformCommunityModerator.IAuthorized> {
  const { body } = props;

  // Verify and decode refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  // Extract user id and validate optional role/type markers
  let userId: string | null = null;
  let tokenRole: string | null = null;
  let tokenType: string | null = null;
  if (decoded && typeof decoded === "object") {
    const obj = decoded as Record<string, unknown>;
    if (typeof obj.id === "string") userId = obj.id;
    else if (typeof obj.userId === "string") userId = obj.userId;
    if (typeof obj.type === "string") tokenRole = obj.type;
    if (typeof obj.tokenType === "string") tokenType = obj.tokenType;
  }
  if (!userId) {
    throw new HttpException("Unauthorized: Token missing subject", 401);
  }
  if (tokenType !== null && tokenType !== "refresh") {
    throw new HttpException("Unauthorized: Not a refresh token", 401);
  }
  if (tokenRole !== null && tokenRole !== "communityModerator") {
    throw new HttpException("Forbidden: Token role mismatch", 403);
  }

  // Load user and verify eligibility
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("Unauthorized: Account not found or deleted", 401);
  }
  if (!user.email_verified) {
    throw new HttpException("Forbidden: Email not verified", 403);
  }
  const forbiddenStates = new Set([
    "Banned",
    "Deleted",
    "Deactivated",
    "Locked",
    "PendingDeletion",
  ]);
  if (forbiddenStates.has(user.account_state)) {
    throw new HttpException(
      "Forbidden: Account state does not allow refresh",
      403,
    );
  }

  // Compute expirations
  const nowMs = Date.now();
  const accessTtlSeconds = 20 * 60; // 20 minutes
  const refreshTtlSeconds = 14 * 24 * 60 * 60; // 14 days
  const accessExpIso = toISOStringSafe(
    new Date(nowMs + accessTtlSeconds * 1000),
  );
  const refreshExpIso = toISOStringSafe(
    new Date(nowMs + refreshTtlSeconds * 1000),
  );

  // Generate new tokens with the same payload structure as login/join
  const access = jwt.sign(
    {
      id: user.id,
      type: "communityModerator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTtlSeconds,
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      id: user.id,
      type: "communityModerator",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTtlSeconds,
      issuer: "autobe",
    },
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at: accessExpIso,
      refreshable_until: refreshExpIso,
    },
    role: "communityModerator",
  };
}
