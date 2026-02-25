import { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardBanHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardBanHistories(props: {
  body: IDiscussionBoardBanHistory.IRequest;
}): Promise<IPageIDiscussionBoardBanHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.action_type !== undefined && {
      action_type: props.body.action_type,
    }),
    ...(props.body.actor_id !== undefined && { actor_id: props.body.actor_id }),
    ...(props.body.discussion_board_user_id !== undefined && {
      discussion_board_user_id: props.body.discussion_board_user_id,
    }),
    ...(props.body.created_at !== undefined && {
      created_at: {
        ...(props.body.created_at.from !== undefined && {
          gte: new Date(props.body.created_at.from),
        }),
        ...(props.body.created_at.to !== undefined && {
          lte: new Date(props.body.created_at.to),
        }),
      },
    }),
  } satisfies Prisma.discussion_board_ban_historiesWhereInput;
  const data = await MyGlobal.prisma.discussion_board_ban_histories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardBanHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_ban_histories.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardBanHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
