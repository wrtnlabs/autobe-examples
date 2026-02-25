import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUnban";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUnban";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardUnbanAtSummaryTransformer } from "../transformers/DiscussionBoardUnbanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUnbans(props: {
  body: IDiscussionBoardUnban.IRequest;
}): Promise<IPageIDiscussionBoardUnban.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtCondition = {
    ...(props.body.from !== undefined && { gte: new Date(props.body.from) }),
    ...(props.body.to !== undefined && { lt: new Date(props.body.to) }),
  };
  const whereInput = {
    deleted_at: null,
    ...(props.body.administrator_id !== undefined && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(Object.keys(createdAtCondition).length > 0 && {
      created_at: createdAtCondition,
    }),
  } satisfies Prisma.discussion_board_unbansWhereInput;
  const data = await MyGlobal.prisma.discussion_board_unbans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardUnbanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_unbans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardUnbanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
