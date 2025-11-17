import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteRedditCommunityModeratorRedditCommunityModeratorsRedditCommunityModeratorIdSessionsId(props: {
  moderator: ModeratorPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findUnique({
      where: { id: props.id },
    });

  if (!session) {
    throw new HttpException("Moderator session not found", 404);
  }

  if (
    session.reddit_community_moderator_id !== props.redditCommunityModeratorId
  ) {
    throw new HttpException("Unauthorized to delete this session", 403);
  }

  await MyGlobal.prisma.reddit_community_moderator_sessions.delete({
    where: { id: props.id },
  });
}
