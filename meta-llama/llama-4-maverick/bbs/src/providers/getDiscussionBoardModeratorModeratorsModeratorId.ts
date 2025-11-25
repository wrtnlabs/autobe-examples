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

export async function getDiscussionBoardModeratorModeratorsModeratorId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardModerator> {
  try {
    const moderatorData =
      await MyGlobal.prisma.discussion_board_moderators.findUnique({
        where: { id: props.moderatorId },
      });

    if (!moderatorData) {
      throw new HttpException("Moderator not found", 404);
    }

    return {
      email: moderatorData.email,
      id: moderatorData.id,
      name: moderatorData.username,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve moderator data", 500);
  }
}
