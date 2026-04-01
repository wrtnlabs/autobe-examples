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
import { RedditLikeMemberTransformer } from "../transformers/RedditLikeMemberTransformer";
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
  const now = new Date();
  const memberId = v4() as string & tags.Format<"uuid">;
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create member record
  const member = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      email_verified: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...RedditLikeMemberTransformer.select(),
  });
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Hash token values for storage
  const accessTokenHash = await PasswordUtil.hash(accessToken);
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);
  // Create session record
  await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: sessionId,
      reddit_like_member_id: memberId,
      access_token_hash: accessTokenHash,
      refresh_token_hash: refreshTokenHash,
      ip: props.ip,
      href: "",
      referrer: "",
      user_agent: "",
      created_at: now,
      expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
    },
  });
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  return {
    ...(await RedditLikeMemberTransformer.transform(member)),
    token,
  } satisfies IRedditLikeMember.IAuthorized;
}
