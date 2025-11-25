import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModeratorsModeratorIdModerationActions(props: {
  moderator: ModeratorPayload;
  moderatorId: string;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  const { moderatorId } = props;
  const page = (props.body ?? { page: 1 }).page ?? 1;
  const limit = (props.body ?? { limit: 100 }).limit ?? 100;
  const skip = (page - 1) * limit;

  try {
    const whereCondition: Prisma.discussion_board_moderation_actionsWhereInput =
      {
        discussion_board_moderator_id: moderatorId,
      };

    const [data, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_moderation_actions.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      MyGlobal.prisma.discussion_board_moderation_actions.count({
        where: whereCondition,
      }),
    ]);

    const moderationActions: IDiscussionBoardModerationAction.ISummary[] =
      data.map((action) => ({
        id: action.id,
        action: action.action_taken,
        result: action.result ?? "Unknown",
        moderator: action.discussion_board_moderator_id,
        created_at: toISOStringSafe(action.created_at),
      }));

    return {
      data: moderationActions,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve moderation actions", 500);
  }
}
