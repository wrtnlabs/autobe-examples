import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCommunityOwnerRefresh(props: {
  body: ICommunityPlatformCommunityOwner.IRefresh;
}): Promise<ICommunityPlatformCommunityOwner.IAuthorized> {
  const { body } = props;

  let decoded: jwt.JwtPayload;
  try {
    const verified = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
    if (typeof verified === "string") {
      throw new HttpException("Unauthorized: Invalid refresh token", 401);
    }
    decoded = verified as jwt.JwtPayload;
  } catch {
    throw new HttpException("Unauthorized: Invalid refresh token", 401);
  }

  const candidateId =
    (decoded as Record<string, unknown>).id ??
    (decoded as Record<string, unknown>).userId ??
    (decoded as Record<string, unknown>).uid ??
    (decoded as Record<string, unknown>).sub ??
    null;
  if (!candidateId || typeof candidateId !== "string") {
    throw new HttpException("Unauthorized: Invalid refresh token subject", 401);
  }

  const maybeType = (decoded as Record<string, unknown>).tokenType;
  if (maybeType !== undefined && maybeType !== "refresh") {
    throw new HttpException("Unauthorized: Invalid token type", 401);
  }

  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { id: candidateId },
    select: {
      id: true,
      email_verified: true,
      account_state: true,
      deleted_at: true,
    },
  });

  if (!user) {
    throw new HttpException("Unauthorized: User not found", 401);
  }
  if (user.deleted_at !== null) {
    throw new HttpException("Forbidden: Account is deleted", 403);
  }

  const disallowedStates = new Set([
    "Locked",
    "Deactivated",
    "PendingDeletion",
    "Deleted",
    "Banned",
  ]);
  if (disallowedStates.has(user.account_state)) {
    throw new HttpException("Forbidden: Account state disallows access", 403);
  }

  const access = jwt.sign(
    {
      id: user.id as string & tags.Format<"uuid">,
      type: "communityowner" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      id: user.id as string & tags.Format<"uuid">,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const nowMs = Date.now();
  const expired_at = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000));
  const refreshable_until = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    role: "communityOwner",
  };
}
