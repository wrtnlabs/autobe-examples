import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerationStatisticsByType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationStatisticsByType";
import { IDiscussionBoardModerationActionTypeStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionTypeStatistic";
import { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorStatisticsModerationActionsByType(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardModerationStatisticsByType.IRequest;
}): Promise<IDiscussionBoardModerationStatisticsByType> {
  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (props.body.start_date || props.body.end_date) {
      conditions.created_at = {};
      if (props.body.start_date) {
        (conditions.created_at as Record<string, unknown>).gte = new Date(
          props.body.start_date,
        );
      }
      if (props.body.end_date) {
        (conditions.created_at as Record<string, unknown>).lte = new Date(
          props.body.end_date,
        );
      }
    }

    if (props.body.moderator_ids && props.body.moderator_ids.length > 0) {
      conditions.discussion_board_moderator_id = {
        in: props.body.moderator_ids,
      };
    }

    if (props.body.action_types && props.body.action_types.length > 0) {
      conditions.action_type = {
        in: props.body.action_types,
      };
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [groupedResults, dateRangeBounds] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderation_logs.groupBy({
      by: ["action_type"],
      where: whereCondition,
      _count: {
        id: true,
      },
    }),
    MyGlobal.prisma.discussion_board_moderation_logs.aggregate({
      where: whereCondition,
      _min: {
        created_at: true,
      },
      _max: {
        created_at: true,
      },
    }),
  ]);

  const totalActions = groupedResults.reduce(
    (sum, result) => sum + result._count.id,
    0,
  );

  const statistics: IDiscussionBoardModerationActionTypeStatistic[] =
    groupedResults.map((result) => ({
      action_type: result.action_type as
        | "article_edited"
        | "article_deleted"
        | "attachment_removed"
        | "account_suspended"
        | "account_banned"
        | "account_restored",
      action_count: result._count.id,
      percentage:
        totalActions > 0 ? (result._count.id / totalActions) * 100 : 0,
    }));

  const startDate = props.body.start_date
    ? props.body.start_date
    : dateRangeBounds._min.created_at
      ? toISOStringSafe(dateRangeBounds._min.created_at)
      : toISOStringSafe(new Date(0));

  const endDate = props.body.end_date
    ? props.body.end_date
    : dateRangeBounds._max.created_at
      ? toISOStringSafe(dateRangeBounds._max.created_at)
      : toISOStringSafe(new Date());

  return {
    statistics,
    total_actions: totalActions,
    date_range: {
      start_date: startDate,
      end_date: endDate,
    },
  };
}
