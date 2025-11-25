import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: ICommunityForumCommunityModerator.ILogin;
}): Promise<ICommunityForumCommunityModerator.IAuthorized> {
  // 1. Find base user by email
  const user = await MyGlobal.prisma.community_forum_users.findFirst({
    where: { email: props.body.email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );

  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Check if user has moderator privileges
  const moderator = await MyGlobal.prisma.community_forum_moderators.findFirst({
    where: { community_forum_user_id: user.id },
  });

  if (!moderator) {
    throw new HttpException("User does not have moderator privileges", 403);
  }

  // 4. Create new moderator session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const session =
    await MyGlobal.prisma.community_forum_moderator_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_forum_moderator_id: moderator.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(now),
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
        created_at: now.toISOString(),
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
        created_at: now.toISOString(),
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
