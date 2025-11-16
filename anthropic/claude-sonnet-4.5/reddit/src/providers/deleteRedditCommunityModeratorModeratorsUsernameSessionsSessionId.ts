import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorModeratorsUsernameSessionsSessionId(props: {
  moderator: ModeratorPayload;
  username: string;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModeratorSession> {
  const targetModerator =
    await MyGlobal.prisma.reddit_community_moderators.findFirst({
      where: {
        username: props.username,
        deleted_at: null,
      },
    });

  if (!targetModerator) {
    throw new HttpException("Moderator not found", 404);
  }

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findUnique({
      where: {
        id: props.sessionId,
      },
    });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.reddit_community_moderator_id !== targetModerator.id) {
    throw new HttpException(
      "Session does not belong to the specified moderator",
      403,
    );
  }

  if (props.moderator.id !== targetModerator.id) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  const terminatedSession =
    await MyGlobal.prisma.reddit_community_moderator_sessions.update({
      where: {
        id: props.sessionId,
      },
      data: {
        expired_at: new Date(),
      },
    });

  return {
    id: terminatedSession.id,
    reddit_community_moderator_id:
      terminatedSession.reddit_community_moderator_id,
    ip: terminatedSession.ip,
    href: terminatedSession.href,
    referrer: terminatedSession.referrer,
    created_at: toISOStringSafe(terminatedSession.created_at),
    expired_at: terminatedSession.expired_at
      ? toISOStringSafe(terminatedSession.expired_at)
      : null,
  };
}
