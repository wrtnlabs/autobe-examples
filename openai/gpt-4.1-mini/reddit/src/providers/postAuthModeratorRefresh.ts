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
  let decoded: unknown;
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    !("session_id" in decoded) ||
    !("type" in decoded) ||
    decoded.type !== "moderator"
  ) {
    throw new HttpException("Invalid refresh token payload", 401);
  }

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id as string & tags.Format<"uuid">,
        reddit_community_moderator_id: decoded.id as string &
          tags.Format<"uuid">,
        expired_at: null,
      },
      include: {
        redditCommunityModerator: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.redditCommunityModerator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: nowIso,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  await MyGlobal.prisma.reddit_community_moderator_sessions.update({
    where: { id: decoded.session_id as string & tags.Format<"uuid"> },
    data: { expired_at: refreshExpires },
  });

  return {
    id: session.redditCommunityModerator.id,
    email: session.redditCommunityModerator.email,
    created_at: toISOStringSafe(session.redditCommunityModerator.created_at),
    updated_at: toISOStringSafe(session.redditCommunityModerator.updated_at),
    deleted_at:
      session.redditCommunityModerator.deleted_at === null
        ? undefined
        : toISOStringSafe(session.redditCommunityModerator.deleted_at),
    token,
  };
}
