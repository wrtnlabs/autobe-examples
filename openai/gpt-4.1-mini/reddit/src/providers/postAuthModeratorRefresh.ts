import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: IRedditCommunityModerator.IRefresh;
}): Promise<IRedditCommunityModerator.IAuthorized> {
  let decodedToken: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decodedToken = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decodedToken.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findFirst({
      where: {
        id: decodedToken.session_id,
        reddit_community_moderator_id: decodedToken.id,
      },
      include: {
        redditCommunityModerator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const moderator = session.redditCommunityModerator;

  // The model has no deleted_at, so no soft delete check

  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: decodedToken.type,
        id: decodedToken.id,
        session_id: decodedToken.session_id,
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
        type: decodedToken.type,
        id: decodedToken.id,
        session_id: decodedToken.session_id,
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

  await MyGlobal.prisma.reddit_community_moderator_sessions.update({
    where: {
      id: decodedToken.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: moderator.id,
    user_id: moderator.user_id,
    created_at: toISOStringSafe(moderator.created_at),
    email: undefined,
    token,
    updated_at: undefined,
  };
}
