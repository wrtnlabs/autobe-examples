import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import { IPageIDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardCategories(props: {
  body: IDiscussionBoardCategory.IRequest;
}): Promise<IPageIDiscussionBoardCategory.ISummary> {
  const { body } = props;

  // Extract pagination parameters with defaults
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 25) as number;
  const skip = (page - 1) * limit;

  // Build where clause based on filters
  const where = {
    deleted_at: null,
    // Handle parent_category_id: undefined = no filter, null = filter for null, value = filter for value
    ...(body.parent_category_id !== undefined && {
      parent_category_id: body.parent_category_id,
    }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && {
        is_active: body.is_active,
      }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { name: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  // Determine sort field and direction with proper typing
  const sortBy = body.sort_by ?? "display_order";
  const sortDirection =
    body.sort_direction ?? (sortBy === "topic_count" ? "desc" : "asc");

  // Execute queries concurrently
  const [categories, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_categories.findMany({
      where,
      orderBy: { [sortBy]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_categories.count({ where }),
  ]);

  // Transform to API response format
  const data: IDiscussionBoardCategory.ISummary[] = categories.map(
    (category) => ({
      id: category.id as string & tags.Format<"uuid">,
      name: category.name,
      slug: category.slug,
      parent_category_id:
        category.parent_category_id === null
          ? null
          : (category.parent_category_id as string & tags.Format<"uuid">),
      display_order: category.display_order,
      is_active: category.is_active,
      topic_count: category.topic_count,
    }),
  );

  // Build pagination response with Number() to strip brand types
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
