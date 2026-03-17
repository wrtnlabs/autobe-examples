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

export async function postRedditLikeAuthMemberLogin(props: {
  ip: string;
  body: IRedditLikeMember.ILogin;
}): Promise<IRedditLikeMember.IAuthorized> {
  // Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email },
    select: {
      ...RedditLikeMemberTransformer.select().select,
      password_hash: true,
    },
  });
  // Generic error to prevent user enumeration
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password using BCrypt
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Check if account is soft-deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Calculate expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: v4(),
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: v4(),
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Create session record
  const sessionId = v4();
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
      created_at: now,
      expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
    },
  });
  // Transform member and add token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    ...(await RedditLikeMemberTransformer.transform(member)),
    token,
  };
}
