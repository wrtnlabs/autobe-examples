import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminAtSummaryTransformer } from "../transformers/DiscussionBoardAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdmins(props: {
  body: IDiscussionBoardAdmin.IRequest;
}): Promise<IPageIDiscussionBoardAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_adminsWhereInput = {
    deleted_at: null,
    ...(props.body.grade && { grade: props.body.grade }),
    ...(props.body.search && {
      display_name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.email && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.discussion_board_adminsWhereInput;
  const validSortFields = ["display_name", "email", "created_at", "grade"];
  const sortBy =
    props.body.sort_by && validSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "created_at";
  const sortOrder = props.body.sort_order === "ASC" ? "ASC" : "DESC";
  const orderByInput: Prisma.discussion_board_adminsOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  } satisfies Prisma.discussion_board_adminsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admins.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...DiscussionBoardAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admins.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminAtSummaryTransformer.transform,
    ),
  } satisfies IPageIDiscussionBoardAdmin.ISummary;
}
