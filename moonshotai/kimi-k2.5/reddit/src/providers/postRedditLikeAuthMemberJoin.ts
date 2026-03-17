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
  // Check for duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Check for duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { username: props.body.username },
    select: { id: true },
  });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create member record
  const member = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
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
  // Calculate token expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date().toISOString();
  // Generate session ID first
  const sessionId = v4();
  // Generate JWT tokens with session ID
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session record
  await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: sessionId,
      reddit_like_member_id: member.id,
      access_token_hash: accessToken,
      refresh_token_hash: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      user_agent: "",
      created_at: new Date(),
      expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
    },
  });
  // Build and return authorized member response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    emailVerified: member.email_verified,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    deletedAt:
      member.deleted_at === null ? null : member.deleted_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IRedditLikeMember.IAuthorized;
}
