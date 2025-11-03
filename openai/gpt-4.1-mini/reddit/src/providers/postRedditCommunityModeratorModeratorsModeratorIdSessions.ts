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

export async function postRedditCommunityModeratorModeratorsModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.ICreate;
}): Promise<IRedditCommunityModeratorSession> {
  const { moderator, moderatorId, body } = props;

  if (moderatorId !== moderator.id) {
    throw new HttpException(
      "Unauthorized: Moderator ID does not match authenticated user",
      403,
    );
  }

  const id = v4() as string & tags.Format<"uuid">;

  const createdSession =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id,
        reddit_community_moderator_id: body.reddit_community_moderator_id,
        ip: body.ip,
        href: body.href,
        referrer: body.referrer,
        created_at: toISOStringSafe(body.created_at),
        expired_at: body.expired_at ?? null,
      },
    });

  return {
    id: createdSession.id,
    reddit_community_moderator_id: createdSession.reddit_community_moderator_id,
    ip: createdSession.ip,
    href: createdSession.href,
    referrer: createdSession.referrer,
    created_at: toISOStringSafe(createdSession.created_at),
    expired_at:
      createdSession.expired_at !== null
        ? toISOStringSafe(createdSession.expired_at)
        : null,
  };
}
