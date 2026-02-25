import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthMemberRefresh(props: {
  body: IRedditCommunityMember.IRefresh;
}): Promise<IRedditCommunityMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "redditCommunity", algorithms: ["HS256"] },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session
  const session =
    await MyGlobal.prisma.reddit_community_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_member_id: decoded.id,
      },
    });
  if (!session || session.expired_at <= new Date()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate member not deleted
  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.is_deleted) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Generate new access and refresh tokens
  const newAccessExpires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
  const newRefreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const access = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "member",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "redditCommunity" },
  );
  const refresh = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "member",
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "redditCommunity" },
  );
  // 5. Update session with new expiration
  await MyGlobal.prisma.reddit_community_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: newRefreshExpires },
  });
  // 6. Construct response manually from basic member fields, not using transformer
  return {
    id: member.id,
    email: null,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? undefined,
    avatar_url: member.avatar_url ?? undefined,
    karma_score: member.karma_score,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    is_deleted: member.is_deleted,
    access,
    refresh,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(newAccessExpires),
      refreshable_until: toISOStringSafe(newRefreshExpires),
    },
  };
}
