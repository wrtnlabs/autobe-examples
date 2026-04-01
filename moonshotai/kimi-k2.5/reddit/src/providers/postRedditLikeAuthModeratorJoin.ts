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
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const nowISO = toISOStringSafe(new Date());
  // Create member with hashed password
  await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: props.body.username,
      password_hash: await PasswordUtil.hash(props.body.password),
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Calculate expiration times
  const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Fetch created member for response
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      username: true,
      email_verified: true,
      created_at: true,
    },
  });
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
    expired_at: toISOStringSafe(accessExpiresAt),
    refreshable_until: toISOStringSafe(refreshExpiresAt),
  };
  // Return authorized response
  // Note: Since this is registration, no moderator role or community exists yet
  return {
    id: undefined as unknown as string & tags.Format<"uuid">, // No moderator record yet
    can_add_moderators: false,
    member: {
      id: member.id,
      email: member.email,
      username: member.username,
      emailVerified: member.email_verified,
      createdAt: toISOStringSafe(member.created_at),
    } satisfies IRedditLikeMember.ISummary,
    community: undefined as unknown as IRedditLikeCommunity.ISummary, // No community assignment yet
    created_at: nowISO,
    updated_at: nowISO,
    deleted_at: null,
    token,
  };
}
