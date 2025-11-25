import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IRedditCommunityCommunityModerator.ICreate;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  const existing = await MyGlobal.prisma.reddit_community_moderators.findFirst({
    where: { email: props.body.email },
  });

  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword: string = await PasswordUtil.hash(props.body.password);

  const moderator = await MyGlobal.prisma.reddit_community_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      username: props.body.nickname,
      password_hash: hashedPassword,
      email_verified: false,
      post_karma: 0,
      comment_karma: 0,
      show_online_status: true,
      show_subscribed_communities: true,
      show_activity_feed: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const accessExpires: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_moderator_id: moderator.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: new Date(),
        expired_at: accessExpires,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    nickname: props.body.nickname,
    created_at: toISOStringSafe(moderator.created_at),
    token,
  };
}
