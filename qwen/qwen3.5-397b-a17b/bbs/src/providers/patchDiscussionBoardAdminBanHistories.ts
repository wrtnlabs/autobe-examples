import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardBanHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanHistory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardBanHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBanHistories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanHistory.IRequest;
}): Promise<IPageIDiscussionBoardBanHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_ban_historiesWhereInput = {
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.discussion_board_ban_id !== undefined && {
      discussion_board_ban_id: props.body.discussion_board_ban_id,
    }),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: props.body.created_at_to,
            }),
          },
        }
      : {}),
    ...(props.body.reason !== undefined && {
      reason: { contains: props.body.reason },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardBanHistoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_ban_histories.count({
      where: whereInput,
    }),
  ]);
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
