import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: ICommunityForumCommunityModerator.ICreate;
  ip?: string;
  href?: string;
  referrer?: string;
}): Promise<ICommunityForumCommunityModerator.IAuthorized> {
  // 1. Validate that the user exists
  const user = await MyGlobal.prisma.community_forum_users.findUnique({
    where: { id: props.body.community_forum_user_id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // 2. Check if user already has moderator privileges
  const existingModerator =
    await MyGlobal.prisma.community_forum_moderators.findUnique({
      where: { community_forum_user_id: props.body.community_forum_user_id },
    });

  if (existingModerator) {
    throw new HttpException("User already has moderator privileges", 409);
  }

  // 3. Create moderator record
  const now = toISOStringSafe(new Date());
  const moderator = await MyGlobal.prisma.community_forum_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_user_id: props.body.community_forum_user_id,
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Create moderator session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.community_forum_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_moderator_id: moderator.id,
        ip: props.ip ?? "127.0.0.1",
        href: props.href ?? "",
        referrer: props.referrer ?? "",
        created_at: toISOStringSafe(new Date()),
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // 5. Generate JWT tokens
  const token: ICommunityForumAuthorizationToken = {
    access: jwt.sign(
      {
        type: "moderator",
        id: moderator.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
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

  // 6. Return authorized moderator object
  return {
    id: moderator.id,
    community_forum_user_id: moderator.community_forum_user_id,
    user: {
      id: user.id,
      username: user.username,
    },
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token,
  };
}
