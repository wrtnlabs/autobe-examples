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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const baseWhere = {
    ...(props.body.search && {
      email: {
        contains: props.body.search,
        mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
      },
    }),
    ...(props.body.admin_grade && { admin_grade: props.body.admin_grade }),
    ...(props.body.include_deleted === false && { deleted_at: null }),
  };
  // Add date range filter if both start and end are provided
  let dateFilter = {};
  if (props.body.created_at_start && props.body.created_at_end) {
    dateFilter = {
      created_at: {
        gte: props.body.created_at_start,
        lte: props.body.created_at_end,
      },
    };
  }
  const where = { ...baseWhere, ...dateFilter };
  // Query discussion_board_admins table (includes both regular and super admins)
  const data = await MyGlobal.prisma.discussion_board_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardAdminAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_admins.count({ where });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
