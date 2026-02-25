import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Build where clause with proper type safety
  const whereInput: Prisma.discussion_board_section_administratorsWhereInput = {
    deleted_at: null,
    ...(props.body.permission_level && {
      permission_level: props.body.permission_level,
    }),
    ...(props.body.assignment_date_start && {
      assignment_date: {
        gte: props.body.assignment_date_start,
      },
    }),
    ...(props.body.assignment_date_end && {
      assignment_date: {
        lte: props.body.assignment_date_end,
      },
    }),
  };
  // Execute queries sequentially
  const data =
    await MyGlobal.prisma.discussion_board_section_administrators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { assignment_date: "desc" },
      ...DiscussionBoardSuperAdminAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_section_administrators.count({
      where: whereInput,
    });
  // Transform data using the transformer
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
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
