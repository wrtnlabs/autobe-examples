import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import { IDiscussionBoardModerationActionOrderBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionOrderBy";
import { IDiscussionBoardModerationActionOrderDirection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionOrderDirection";
import { IPageIDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorModerationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationAction.IRequest;
}): Promise<IPageIDiscussionBoardModerationAction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition with proper filtering
  const whereCondition: Prisma.discussion_board_moderation_actionsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          action_details: { contains: props.body.search, mode: "insensitive" },
        },
        { action_type: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.action_type && {
      action_type: props.body.action_type,
    }),
    ...(props.body.escalation_level && {
      escalation_level: props.body.escalation_level,
    }),
  };

  // Build orderBy condition with validation
  const orderByCondition: Prisma.discussion_board_moderation_actionsOrderByWithRelationInput =
    {};

  if (props.body.order_by && props.body.order_direction) {
    const validOrderFields: Record<string, Prisma.SortOrder> = {
      created_at: props.body.order_direction,
      action_type: props.body.order_direction,
      escalation_level: props.body.order_direction,
    };

    if (validOrderFields[props.body.order_by]) {
      orderByCondition[props.body.order_by] =
        validOrderFields[props.body.order_by];
    } else {
      orderByCondition.created_at = "desc";
    }
  } else {
    orderByCondition.created_at = "desc";
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_actions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.discussion_board_moderation_actions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((action) => ({
      id: action.id,
      action_type: action.action_type,
      action_details:
        action.action_details === null ? undefined : action.action_details,
      duration_days:
        action.duration_days === null ? undefined : action.duration_days,
      escalation_level: action.escalation_level,
      created_at: toISOStringSafe(action.created_at),
      discussion_board_content_report_id:
        action.discussion_board_content_report_id,
      discussion_board_moderator_id: action.discussion_board_moderator_id,
      discussion_board_moderator_session_id:
        action.discussion_board_moderator_session_id,
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
