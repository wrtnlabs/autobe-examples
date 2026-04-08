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
  // 1. Verify refresh token
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("type" in decoded) ||
    !("id" in decoded) ||
    !("session_id" in decoded) ||
    !("created_at" in decoded)
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const tokenType = decoded.type;
  const tokenId = decoded.id;
  const tokenSessionId = decoded.session_id;
  const tokenCreatedAt = decoded.created_at;
  // 2. Validate type
  if (tokenType !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session = await MyGlobal.prisma.reddit_like_member_sessions.findFirst({
    where: {
      id: tokenSessionId as string & tags.Format<"uuid">,
      reddit_like_member_id: tokenId as string & tags.Format<"uuid">,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member exists and not soft-deleted
  const member = await MyGlobal.prisma.reddit_like_members.findUnique({
    where: { id: tokenId as string & tags.Format<"uuid"> },
    include: {
      userProfile: true,
    },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (!member.userProfile) {
    throw new HttpException("User profile not found", 404);
  }
  // 5. Generate new tokens with SAME session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: tokenType,
      id: tokenId,
      session_id: tokenSessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: tokenType,
      id: tokenId,
      session_id: tokenSessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_like_member_sessions.update({
    where: { id: tokenSessionId as string & tags.Format<"uuid"> },
    data: { expired_at: refreshExpires },
  });
  // 7. Build response
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email,
    username: member.username,
    display_name: member.userProfile.display_name,
    bio: member.userProfile.bio,
    avatar: member.userProfile.avatar,
    karma_score: member.userProfile.karma_score,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
