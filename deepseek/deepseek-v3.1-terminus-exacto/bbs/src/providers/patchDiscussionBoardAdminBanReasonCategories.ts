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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBanReasonCategories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanReasonCategory.IRequest;
}): Promise<IPageIDiscussionBoardBanReasonCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.discussion_board_ban_reason_categoriesWhereInput = {
    deleted_at: null, // Exclude soft-deleted records
    ...(props.body.name && { name: { contains: props.body.name } }),
    ...(props.body.is_active !== undefined && {
      is_active:
        props.body.is_active === null ? undefined : props.body.is_active,
    }),
  };
  // Add sort_order range filtering
  if (
    props.body.sort_order_min !== undefined ||
    props.body.sort_order_max !== undefined
  ) {
    const sortOrderConditions: Prisma.discussion_board_ban_reason_categoriesWhereInput[] =
      [];
    if (props.body.sort_order_min !== undefined) {
      sortOrderConditions.push({
        sort_order: { gte: props.body.sort_order_min },
      });
    }
    if (props.body.sort_order_max !== undefined) {
      sortOrderConditions.push({
        sort_order: { lte: props.body.sort_order_max },
      });
    }
    // Fix: Handle both single object and array cases for AND
    if (whereInput.AND) {
      if (Array.isArray(whereInput.AND)) {
        whereInput.AND = [...whereInput.AND, ...sortOrderConditions];
      } else {
        whereInput.AND = [whereInput.AND, ...sortOrderConditions];
      }
    } else {
      whereInput.AND = sortOrderConditions;
    }
  }
  // Get paginated data
  const data =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [
        { sort_order: "asc" as const },
        { created_at: "desc" as const }, // Fallback sorting
      ],
    });
  // Get total count
  const total =
    await MyGlobal.prisma.discussion_board_ban_reason_categories.count({
      where: whereInput,
    });
  // Transform data to ISummary format with proper typing
  const transformedData: IDiscussionBoardBanReasonCategory.ISummary[] =
    data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      name: record.name,
      is_active: record.is_active,
      sort_order: record.sort_order as number & tags.Type<"int32">,
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
