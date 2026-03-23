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
  ip: string;
  body: IRedditLikeMember.IJoin;
}): Promise<IRedditLikeMember.IAuthorized> {
  // Check duplicate email
  const existing = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Check duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { username: props.body.username },
  });
  if (existingUsername)
    throw new HttpException("Username already registered", 409);
  // Create member with hashed password
  const member = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatarUrl ?? null,
      karma_score: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
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
  // Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ip: props.ip,
      user_agent: props.ip ?? "",
      access_token: v4(),
      refresh_token: v4(),
      expired_at: toISOStringSafe(accessExpires),
      access_token_expires_at: toISOStringSafe(accessExpires),
      refresh_token_expires_at: toISOStringSafe(refreshExpires),
      member: {
        connect: {
          id: member.id,
        },
      },
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      ip: true,
      user_agent: true,
      access_token: true,
      refresh_token: true,
      expired_at: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Build response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar_url: member.avatar_url,
    karma_score: member.karma_score,
    created_at: toISOStringSafe(member.created_at),
    updated_at: member.updated_at
      ? toISOStringSafe(member.updated_at)
      : undefined,
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    member: {
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      bio: member.bio,
      avatar_url: member.avatar_url,
      karma_score: member.karma_score,
      created_at: toISOStringSafe(member.created_at),
    } satisfies IRedditLikeMember.ISummary,
    token,
  } satisfies IRedditLikeMember.IAuthorized;
}
