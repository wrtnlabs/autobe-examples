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

export async function postRedditLikeAuthMemberJoin(props: {
  body: IRedditLikeMember.IJoin;
}): Promise<IRedditLikeMember.IAuthorized> {
  // 1. Check duplicate
  const existing = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      OR: [{ email: props.body.email }, { username: props.body.username }],
    },
  });
  if (existing)
    throw new HttpException("Email or username already exists", 409);
  // 2. Create member
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const member = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      username: props.body.username,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name ?? props.body.username,
      bio: props.body.bio,
      avatar_url: props.body.avatar_url,
      karma_score: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: v4(),
      member_id: member.id,
      access_token: "placeholder",
      refresh_token: "placeholder",
      access_token_expires_at: accessExpires,
      refresh_token_expires_at: refreshExpires,
      ip: "0.0.0.0",
      user_agent: "",
      created_at: now,
      updated_at: now,
      expired_at: null,
      revoked_at: null,
    },
    select: {
      id: true,
    },
  });
  // 4. Generate JWT tokens
  const accessJwt = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshJwt = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IAuthorized
  return {
    total_posts: 0,
    posts_today: 0,
    total_comments: 0,
    comments_today: 0,
    total_votes: 0,
    comment_votes_today: 0,
    total_communities: 0,
    subscribed_count: 0,
    pending_reports: 0,
    active_users: 0,
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? undefined,
    avatar_url: member.avatar_url ?? undefined,
    karma_score: member.karma_score,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (member.deleted_at?.toISOString() as string & tags.Format<"date-time">) ??
      null,
    token: {
      access: accessJwt,
      refresh: refreshJwt,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies IRedditLikeMember.IAuthorized;
}
