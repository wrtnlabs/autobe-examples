import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCategories(props: {
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.page_size ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  // Valid sort fields whitelist
  const validSortFields: Array<
    keyof Prisma.ecommerce_mall_categoriesOrderByWithRelationInput
  > = ["display_order", "name", "created_at"];
  // Build WHERE conditions
  const whereConditions: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
  };
  // Apply search filter
  if (props.body.search_term) {
    whereConditions.OR = [
      {
        name: {
          contains: props.body.search_term,
          mode: "insensitive",
        },
      },
      {
        slug: props.body.search_term,
      },
    ] as Prisma.ecommerce_mall_categoriesWhereInput[];
  }
  // Apply parent_id filter (exclude if explicitly null/undefined)
  if (props.body.parent_id !== undefined) {
    if (props.body.parent_id === null) {
      whereConditions.parent_id = null;
    } else {
      whereConditions.parent_id = props.body.parent_id;
    }
  }
  // Apply is_active filter
  if (props.body.is_active !== undefined) {
    whereConditions.is_active = props.body.is_active;
  }
  // Build ORDER BY with validation
  const orderByKey = props.body.sort_by ?? "display_order";
  const orderByDirection = props.body.sort_order === "desc" ? "desc" : "asc";
  if (!validSortFields.includes(orderByKey as never)) {
    throw new HttpException("Invalid sort field", 400);
  }
  const orderByInput = {
    [orderByKey]: orderByDirection,
  } satisfies Prisma.ecommerce_mall_categoriesOrderByWithRelationInput as
    | Prisma.ecommerce_mall_categoriesOrderByWithRelationInput
    | Prisma.ecommerce_mall_categoriesOrderByWithRelationInput[];
  // Fetch paginated data
  const data = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: Array.isArray(orderByInput) ? orderByInput : [orderByInput],
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
  });
  // Fetch total count
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereConditions,
  });
  // Transform results
  const transformedData =
    await EcommerceMallCategoryAtSummaryTransformer.transformAll(data);
  // Build pagination metadata
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
    data: transformedData,
  };
}
