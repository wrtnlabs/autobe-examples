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
import { RedditLikeModeratorTransformer } from "../transformers/RedditLikeModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthModeratorLogin(props: {
  ip: string;
  body: IRedditLikeModerator.ILogin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  // Find member by email with password_hash for verification
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      email: props.body.email,
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
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Find moderator role for this member
  const moderator = await MyGlobal.prisma.reddit_like_moderators.findFirst({
    where: {
      member_id: member.id,
      deleted_at: null,
    },
    ...RedditLikeModeratorTransformer.select(),
  });
  if (!moderator) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Create new session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_moderator_sessions.create({
    data: {
      id: v4(),
      moderator_id: moderator.id,
      ip: props.ip,
      href: ((props.body as any).href as string | undefined) ?? "",
      referrer: ((props.body as any).referrer as string | undefined) ?? "",
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // Transform and return
  const moderatorDto =
    await RedditLikeModeratorTransformer.transform(moderator);
  return {
    ...moderatorDto,
    token,
  } satisfies IRedditLikeModerator.IAuthorized;
}
