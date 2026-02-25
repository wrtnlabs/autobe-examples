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

export async function postRedditCloneAuthMemberJoin(props: {
  body: IRedditCloneMember.IJoin;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member record
  const member = await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName ?? null,
      bio: null,
      avatar_url: null,
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
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create session record
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: v4(),
      member_id: member.id,
      access_token: "", // Will be populated after JWT generation
      refresh_token: "", // Will be populated after JWT generation
      expires_at: toISOStringSafe(accessExpires),
      active: true,
      ip: props.body.ip ?? null,
      user_agent: null,
      referrer: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
    select: {
      id: true,
      member_id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      active: true,
      ip: true,
      user_agent: true,
      referrer: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "member",
    id: member.id,
    session_id: session.id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: "member",
    id: member.id,
    session_id: session.id,
    tokenType: "refresh",
    created_at: toISOStringSafe(new Date()),
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Update session with tokens
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
    },
  });
  // 5. Build response
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarUrl: member.avatar_url,
    karma: 0,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    token,
  };
}
