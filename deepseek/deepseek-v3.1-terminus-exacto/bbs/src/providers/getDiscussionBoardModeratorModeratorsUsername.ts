import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getDiscussionBoardModeratorModeratorsUsername(props: {
  moderator: ModeratorPayload;
  username: string;
}): Promise<IDiscussionBoardModerator.ISummary> {
  const moderator = await MyGlobal.prisma.discussion_board_moderators.findFirst(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
    },
  );

  if (!moderator) {
    throw new HttpException("Moderator not found", 404);
  }

  return {
    id: moderator.id,
    username: moderator.username,
    display_name: moderator.display_name ?? undefined,
    moderation_level: moderator.moderation_level,
    created_at: toISOStringSafe(moderator.created_at),
  };
}
