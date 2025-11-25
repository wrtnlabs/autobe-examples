import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import { IPageIEconPoliticalDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionCategorySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconPoliticalDiscussionCategorySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategorySummary";

export async function patchEconPoliticalDiscussionCategories(props: {
  body: IEconPoliticalDiscussionCategory.IRequest;
}): Promise<IPageIEconPoliticalDiscussionCategorySummary> {
  const { body } = props;

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build the base where clause for filtering
  const whereClause = {
    deleted_at: null,
  };

  // Get all category statistics with filtering
  const categoryStats =
    await MyGlobal.prisma.econ_political_discussion_articles.groupBy({
      by: ["category"],
      where: whereClause,
      _count: { category: true },
      _max: { created_at: true },
    });

  // Apply search filter
  let filteredCategories = categoryStats;
  if (body.search) {
    const searchLower = body.search.toLowerCase();
    filteredCategories = filteredCategories.filter((cat) =>
      cat.category.toLowerCase().includes(searchLower),
    );
  }

  // Apply status filtering
  if (body.status) {
    switch (body.status) {
      case "active":
        filteredCategories = filteredCategories.filter(
          (cat) => cat._count.category > 0,
        );
        break;
      case "inactive":
        filteredCategories = filteredCategories.filter(
          (cat) => cat._count.category === 0,
        );
        break;
      case "all":
      default:
        // No additional filtering needed
        break;
    }
  }

  // Apply has_articles filter
  if (body.has_articles !== undefined) {
    filteredCategories = filteredCategories.filter((cat) =>
      body.has_articles ? cat._count.category > 0 : cat._count.category === 0,
    );
  }

  // Sort the results
  const sortBy = body.sort_by ?? "name";
  const sortOrder = body.sort_order ?? "asc";

  filteredCategories.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.category.localeCompare(b.category);
        break;
      case "articles_count":
        comparison = a._count.category - b._count.category;
        break;
      case "created_at":
        const aTime = a._max.created_at ? a._max.created_at.getTime() : 0;
        const bTime = b._max.created_at ? b._max.created_at.getTime() : 0;
        comparison = aTime - bTime;
        break;
      default:
        comparison = a.category.localeCompare(b.category);
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  // Apply pagination
  const total = filteredCategories.length;
  const paginatedCategories = filteredCategories.slice(skip, skip + limit);

  // Generate consistent UUID for each category based on name
  const generateCategoryId = (categoryName: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(`category_${categoryName}`);
    const hash = Array.from(data).reduce((hash, byte) => {
      return (hash << 5) - hash + byte;
    }, 0);
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      (c) => {
        const r = (hash & 0xf) + Math.random() * 16;
        const v = r & 0xf;
        return c === "x" ? v.toString(16) : ((v & 0x3) | 0x8).toString(16);
      },
    );
    return uuid as string & tags.Format<"uuid">;
  };

  // Format the response
  const data = paginatedCategories.map((cat) => ({
    id: generateCategoryId(cat.category),
    name: cat.category,
    description: undefined,
    color: undefined,
    icon: undefined,
    is_active: cat._count.category > 0,
    articles_count: cat._count.category,
    recent_activity: cat._max.created_at
      ? toISOStringSafe(cat._max.created_at)
      : undefined,
    created_at: undefined,
    updated_at: undefined,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
