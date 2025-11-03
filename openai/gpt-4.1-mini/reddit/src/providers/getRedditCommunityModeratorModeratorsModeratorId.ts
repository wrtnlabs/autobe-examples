import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModerator> {
  const moderator =
    await MyGlobal.prisma.reddit_community_moderator.findUniqueOrThrow({
      where: { id: props.moderatorId },
    });

  if (props.moderator.id !== moderator.id) {
    throw new HttpException("Unauthorized: Access denied", 403);
  }

  return {
    id: moderator.id,
    user_id: moderator.user_id,
    created_at: toISOStringSafe(moderator.created_at),
  };
}
