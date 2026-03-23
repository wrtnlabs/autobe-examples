import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberRefresh(props: {
  body: IRedditCloneMember.IRefresh;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Extract refresh token
  const refreshToken = props.body.refresh_token;
  // 2. Find session by refresh token
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      refresh_token: refreshToken,
    },
    include: {
      member: true,
    },
  });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Validate session not expired
  const now = new Date();
  if (session.refresh_token_expires_at <= now) {
    throw new HttpException("Refresh token has expired", 401);
  }
  // 4. Validate member not deleted
  if (session.member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      type: "member",
      id: session.member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: session.member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      expired_at: refreshExpires,
    },
  });
  // 7. Fetch member data
  const member = session.member;
  // 8. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar_uri: member.avatar_uri,
    karma: member.karma,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
