import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "../transformers/DiscussionBoardSuperAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdmins(props: {
  body: IDiscussionBoardSuperAdmin.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdmin.ISummary> {
  const page = 1; // Default to page 1 since no page parameter in request body
  const limit = 100; // Default limit as per specification
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereConditions: Prisma.discussion_board_super_adminsWhereInput = {
    deleted_at: null,
  };
  // Handle date range filtering with proper ISO string conversion
  if (props.body.start_date || props.body.end_date) {
    whereConditions.created_at = {};
    if (props.body.start_date) {
      whereConditions.created_at.gte = props.body.start_date;
    }
    if (props.body.end_date) {
      whereConditions.created_at.lte = props.body.end_date;
    }
  }
  // Get paginated data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_super_admins.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSuperAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_super_admins.count({
      where: whereConditions,
    }),
  ]);
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSuperAdminAtSummaryTransformer.transform,
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
