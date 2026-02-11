import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityOwnerRefresh(props: {
  body: IRedditCommunityCommunityOwner.IRefresh;
}): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  // Extract refresh token from HTTP-only cookie (auto-injected by AutoBE middleware)
  const rawRefreshToken = (MyGlobal as any).refreshToken;
  if (!rawRefreshToken) {
    throw new HttpException("Refresh token not provided", 401);
  }
  // 1. Validate token signature and expiration
  let decoded: {
    id: string;
    session_id: string;
    type: "communityOwner";
    created_at: string;
  };
  try {
    decoded = jwt.verify(rawRefreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "communityOwner";
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "communityOwner") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Lookup session in reddit_community_community_owner_sessions
  const session =
    await MyGlobal.prisma.reddit_community_community_owner_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_community_owner_id: decoded.id,
        expired_at: { gte: toISOStringSafe(new Date()) },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check if refresh token already revoked
  const revoked =
    await MyGlobal.prisma.reddit_community_token_revocations.findFirst({
      where: {
        jwt_token: rawRefreshToken,
      },
    });
  if (revoked) {
    throw new HttpException("Token has been revoked", 401);
  }
  // 5. Generate new access token (15 min), new refresh token (7 days)
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newAccessToken = jwt.sign(
    {
      type: "communityOwner",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "communityOwner",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Insert old refresh token into reddit_community_token_revocations
  await MyGlobal.prisma.reddit_community_token_revocations.create({
    data: {
      id: v4(),
      jwt_token: rawRefreshToken,
      actor_type: "communityOwner",
      revoked_at: toISOStringSafe(new Date()),
      expires_at: session.expired_at,
      created_at: toISOStringSafe(new Date()),
    },
  });
  // 7. Return IAuthorized with new tokens
  return {
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
