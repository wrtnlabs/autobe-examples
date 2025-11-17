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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: ICommunityForumCommunityModerator.IRefresh;
}): Promise<ICommunityForumCommunityModerator.IAuthorized> {
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Validate type matches expected actor type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.community_forum_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_forum_moderator_id: decoded.id,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 4. Fetch moderator and user data
  const moderator = await MyGlobal.prisma.community_forum_moderators.findFirst({
    where: {
      id: decoded.id,
    },
  });

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  // Fetch user data separately since we can't include it directly
  const user = await MyGlobal.prisma.community_forum_users.findFirst({
    where: {
      id: moderator.community_forum_user_id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // 5. Generate new tokens (SAME session_id)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id, // Reuse existing session
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id, // Reuse existing session
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Update session expiration time
  await MyGlobal.prisma.community_forum_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // 7. Return refreshed tokens
  return {
    id: moderator.id,
    community_forum_user_id: moderator.community_forum_user_id,
    user: {
      id: user.id,
      username: user.username,
    },
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
