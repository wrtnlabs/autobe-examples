import { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminBanReasonCategories(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBanReasonCategory.IRequest;
}): Promise<IPageIDiscussionBoardBanReasonCategory.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper type safety
  const whereInput: Prisma.discussion_board_ban_reason_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
    ...(props.body.sort_order_min !== undefined && {
      sort_order: {
        gte: props.body.sort_order_min,
      },
    }),
    ...(props.body.sort_order_max !== undefined && {
      sort_order: {
        lte: props.body.sort_order_max,
      },
    }),
  };
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { sort_order: "asc" as const },
      select: {
        id: true,
        name: true,
        is_active: true,
        sort_order: true,
      },
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.count({
      where: whereInput,
    });
  // Transform data to DTO format with proper type casting
  const transformedData: IDiscussionBoardBanReasonCategory.ISummary[] =
    data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      name: item.name,
      is_active: item.is_active,
      sort_order: item.sort_order as number & tags.Type<"int32">,
    }));
  // Calculate pagination metadata with proper type constraints
  const currentPage = Math.max(0, page) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const pageLimit = Math.max(0, limit) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const totalRecords = Math.max(0, total) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const totalPages = Math.max(
    0,
    Math.ceil(totalRecords / pageLimit),
  ) as number & tags.Type<"int32"> & tags.Minimum<0>;
  return {
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
