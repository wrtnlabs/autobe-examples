import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthModeratorJoin(props: {
  ip: string;
  body: IRedditLikeModerator.IJoin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // Check for duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Check for duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { username: props.body.username },
  });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Generate IDs and timestamps as strings
  const memberId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  const nowISO: string & tags.Format<"date-time"> = new Date().toISOString();
  // Create member using Prisma (Prisma accepts Date for DateTime columns)
  const member = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...RedditLikeMemberAtSummaryTransformer.select(),
  });
  // Calculate expiration timestamps
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 15 * 60 * 1000; // 15 minutes
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    accessExpiresMs,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    refreshExpiresMs,
  ).toISOString();
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: memberId,
        session_id: sessionId,
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: memberId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: nowISO,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Transform member to summary
  const memberSummary =
    await RedditLikeMemberAtSummaryTransformer.transform(member);
  // Construct response - for join, no community assigned yet
  // Use minimal valid community summary to satisfy type requirements
  const communityId: string & tags.Format<"uuid"> = v4();
  const response: IRedditLikeModerator.IAuthorized = {
    id: sessionId,
    can_add_moderators: false,
    member: memberSummary,
    community: {
      id: communityId,
      name: "",
      description: "",
      owner: memberSummary,
      icon: null,
      subscriberCount: 0,
      createdAt: nowISO,
    },
    created_at: nowISO,
    updated_at: nowISO,
    deleted_at: null,
    token,
  };
  return response;
}
