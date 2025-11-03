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

  // Pagination parameters with defaults and validation
  const page = Math.max((body.page ?? 1) as number, 1);
  const limit = Math.min(Math.max((body.limit ?? 20) as number, 1), 100);
  const skip = (page - 1) * limit;

  // Build where clause conditionally
  const where: Record<string, any> = {};

  // Keyword search across name and description
  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { name: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  // Name partial match filter (only if search not provided to avoid conflict)
  if (body.name !== undefined && body.name !== null && !body.search) {
    where.name = { contains: body.name };
  }

  // Slug exact match filter
  if (body.slug !== undefined && body.slug !== null) {
    where.slug = body.slug;
  }

  // Date range filtering
  if (
    (body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
  ) {
    where.created_at = {};
    if (body.created_after !== undefined && body.created_after !== null) {
      where.created_at.gte = body.created_after;
    }
    if (body.created_before !== undefined && body.created_before !== null) {
      where.created_at.lte = body.created_before;
    }
  }

  // Determine orderBy field and direction
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  const allowedSortFields = ["name", "created_at", "updated_at", "slug"];
  const orderByField = allowedSortFields.includes(sortBy)
    ? sortBy
    : "created_at";

  // Execute queries in parallel
  const [categories, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_categories.findMany({
      where,
      orderBy: { [orderByField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_categories.count({ where }),
  ]);

  // Transform to ISummary format
  const data = categories.map((category) => ({
    id: category.id as string & tags.Format<"uuid">,
    name: category.name,
    slug: category.slug,
    description: category.description ?? undefined,
    created_at: toISOStringSafe(category.created_at),
    updated_at: toISOStringSafe(category.updated_at),
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: totalCount,
      pages: totalPages,
    },
    data,
  };
}
