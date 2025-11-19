import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAccountAction";
import { IPageIDiscussionBoardAccountAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAccountAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorAccountActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardAccountAction.IRequest;
}): Promise<IPageIDiscussionBoardAccountAction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(props.body.action_type && {
      action_type: props.body.action_type,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.member_id && {
      discussion_board_member_id: props.body.member_id,
    }),
    ...(props.body.moderator_id && {
      discussion_board_moderator_id: props.body.moderator_id,
    }),
    ...(() => {
      if (!props.body.created_after && !props.body.created_before) return {};
      return {
        created_at: {
          ...(props.body.created_after && {
            gte: new Date(props.body.created_after),
          }),
          ...(props.body.created_before && {
            lte: new Date(props.body.created_before),
          }),
        },
      };
    })(),
  };

  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_account_actions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.discussion_board_account_actions.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: data.map((action) => ({
      id: action.id,
      action_type: typia.assert<"suspension" | "ban">(action.action_type),
      reason: action.reason,
      status: typia.assert<"active" | "reversed">(action.status),
      duration_days: typia.assert<1 | 7 | 14 | 30 | null | undefined>(
        action.duration_days,
      ),
      created_at: toISOStringSafe(action.created_at),
      expires_at: action.expires_at ? toISOStringSafe(action.expires_at) : null,
      reversed_at: action.reversed_at
        ? toISOStringSafe(action.reversed_at)
        : null,
    })),
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
