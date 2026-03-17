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
  // Import crypto dynamically since it's not in the imports
  const crypto = await import("crypto");

  // Verify the refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // Hash the refresh token to look up the session
  const refreshTokenHash = crypto
    .createHash("sha256")
    .update(props.body.refreshToken)
    .digest("hex");
  // Look up session by refresh token hash
  const session = await MyGlobal.prisma.reddit_like_member_sessions.findFirst({
    where: {
      refresh_token_hash: refreshTokenHash,
      reddit_like_member_id: decoded.id,
    },
    select: {
      id: true,
      reddit_like_member_id: true,
      refresh_expires_at: true,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Verify refresh token hasn't expired
  const now = new Date();
  if (session.refresh_expires_at < now) {
    throw new HttpException("Refresh token expired", 401);
  }
  // Verify member account is active
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      username: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const nowISO = now.toISOString();
  // Generate new access token
  const newAccessToken = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: session.id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Generate new refresh token
  const newRefreshToken = jwt.sign(
    {
      type: "member" as const,
      id: member.id,
      session_id: session.id,
      tokenType: "refresh" as const,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Hash the new tokens
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
      expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
    },
  });
  // Return member info with new tokens
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    username: member.username,
    emailVerified: member.email_verified,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt: (member.deleted_at as Date | null)?.toISOString() ?? null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IRedditLikeMember.IAuthorized;
}
