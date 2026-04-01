import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthMemberRefresh(props: {
  body: IRedditLikeMember.IRefresh;
}): Promise<IRedditLikeMember.IAuthorized> {
  // Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // Hash the refresh token to look up session
  const crypto = await import("crypto");

  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(props.body.refreshToken)
    .digest("hex");
  // Find session by refresh token hash
  const session = await MyGlobal.prisma.reddit_like_member_sessions.findFirst({
    where: {
      refresh_token_hash: refreshTokenHash,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }
  // Check if refresh token is expired
  const now = new Date();
  if (new Date(session.refresh_expires_at) <= now) {
    throw new HttpException("Refresh token expired", 401);
  }
  // Verify member exists and is active
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration times
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // Generate new tokens with SAME session_id
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Hash new tokens
  const newAccessTokenHash = crypto
    .createHash("sha256")
    .update(newAccessToken)
    .digest("hex");
  const newRefreshTokenHash = crypto
    .createHash("sha256")
    .update(newRefreshToken)
    .digest("hex");
  // Update session with new token hashes and expiration times
  await MyGlobal.prisma.reddit_like_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token_hash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
    },
  });
  // Return member with new tokens
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    username: member.username,
    emailVerified: member.email_verified,
    createdAt: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      member.deleted_at === null
        ? null
        : (toISOStringSafe(member.deleted_at) as string &
            tags.Format<"date-time">),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpiresAt) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpiresAt) as string &
        tags.Format<"date-time">,
    } satisfies IAuthorizationToken,
  } satisfies IRedditLikeMember.IAuthorized;
}
