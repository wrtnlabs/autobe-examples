import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanAtSummaryTransformer } from "../transformers/DiscussionBoardBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBan.IRequest;
}): Promise<IPageIDiscussionBoardBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_bansWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { member: { display_name: { contains: props.body.search } } },
        { member: { email: { contains: props.body.search } } },
        { reason: { contains: props.body.search } },
      ],
    }),
    ...(props.body.from && { banned_at: { gte: new Date(props.body.from) } }),
    ...(props.body.to && { banned_at: { lte: new Date(props.body.to) } }),
  } satisfies Prisma.discussion_board_bansWhereInput;
  const sortField = props.body.sort ?? "banned_at";
  const direction = props.body.direction ?? "desc";
  const orderByInput = {
    [sortField]: direction,
  } satisfies Prisma.discussion_board_bansOrderByWithRelationInput;
  const data = await MyGlobal.prisma.discussion_board_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
