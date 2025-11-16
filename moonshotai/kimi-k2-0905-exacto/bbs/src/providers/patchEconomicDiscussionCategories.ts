import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import { IPageIEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";

export async function patchEconomicDiscussionCategories(props: {
  body: IEconomicDiscussionCategory.IRequest;
}): Promise<IPageIEconomicDiscussionCategory.ISummary> {
  const {
    search,
    is_active,
    sort_by = "display_order",
    sort_order = "asc",
    page = 1,
    limit = 20,
  } = props.body;

  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }

  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const whereConditions: Prisma.economic_discussion_categoriesWhereInput = {
    deleted_at: null,
  };

  if (search !== undefined && search.trim() !== "") {
    whereConditions.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  if (is_active !== undefined && is_active !== null) {
    whereConditions.is_active = is_active;
  }

  const validSortFields = [
    "code",
    "name",
    "display_order",
    "article_count",
    "created_at",
  ] as const;
  const validSortOrders = ["asc", "desc"] as const;

  if (!validSortFields.includes(sort_by as any)) {
    throw new HttpException(`Invalid sort_by field: ${sort_by}`, 400);
  }

  if (!validSortOrders.includes(sort_order as any)) {
    throw new HttpException(`Invalid sort_order: ${sort_order}`, 400);
  }

  const orderBy = {
    [sort_by]: sort_order,
  } as Prisma.economic_discussion_categoriesOrderByWithRelationInput;

  const [categories, totalCount] = await Promise.all([
    MyGlobal.prisma.economic_discussion_categories.findMany({
      where: whereConditions,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        code: true,
        name: true,
        display_order: true,
        is_active: true,
        article_count: true,
      },
    }),
    MyGlobal.prisma.economic_discussion_categories.count({
      where: whereConditions,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: categories,
    pagination: {
      current: String(page) as ICrIPageIntegerRequired,
      limit: String(limit) as ICrIPageIntegerRequired,
      pages: String(totalPages) as ICrIPageIntegerRequired,
      records: String(totalCount) as ICrIPageIntegerRequired,
    },
  };
}
