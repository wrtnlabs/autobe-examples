import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunityModeratorsRedditCommunityModeratorIdSessionsId(props: {
  admin: AdminPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const foundSession =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findUnique({
      where: { id: props.id },
    });

  if (!foundSession) {
    throw new HttpException("Moderator session not found", 404);
  }

  if (
    foundSession.reddit_community_moderator_id !==
    props.redditCommunityModeratorId
  ) {
    throw new HttpException(
      "Session does not belong to the specified moderator",
      403,
    );
  }

  await MyGlobal.prisma.reddit_community_moderator_sessions.delete({
    where: { id: props.id },
  });
}
