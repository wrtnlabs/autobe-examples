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
  const limit = props.body.limit ?? 20;
  // Validate page size boundaries (10-100 inclusive)
  const validatedLimit = Math.max(10, Math.min(limit, 100));
  const validatedPage = Math.max(1, page);
  const skip = (validatedPage - 1) * validatedLimit;
  // Build where conditions for filtering
  const whereInput: Prisma.ecommerce_mall_categoriesWhereInput = {
    // Default: exclude soft-deleted categories unless includeInactive is true
    ...(props.body.includeInactive ? {} : { deleted_at: null }),
    // Name partial match (case-insensitive)
    ...(props.body.name !== undefined
      ? { name: { contains: props.body.name, mode: "insensitive" as const } }
      : {}),
    // Description partial match (case-insensitive)
    ...(props.body.description !== undefined
      ? {
          description: {
            contains: props.body.description,
            mode: "insensitive" as const,
          },
        }
      : {}),
    // Parent category filter
    ...(props.body.parentCategoryId !== undefined
      ? { parent_category_id: props.body.parentCategoryId }
      : {}),
    // Combined search across name and description fields
    ...(props.body.searchQuery !== undefined
      ? {
          OR: [
            {
              name: {
                contains: props.body.searchQuery,
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: props.body.searchQuery,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_categoriesWhereInput;
  // Build order by condition based on sortBy parameter
  const sortOrder =
    props.body.sortOrder === "desc"
      ? Prisma.SortOrder.desc
      : Prisma.SortOrder.asc;
  const orderByInput =
    props.body.sortBy === "created_at"
      ? { created_at: sortOrder }
      : { name: sortOrder };
  // Execute findMany query with transformer select
  const data = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: orderByInput,
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
  });
  // Execute count query for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereInput,
  });
  // Transform results using existing transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCategoryAtSummaryTransformer.transform,
  );
  // Build pagination metadata with proper calculations
  const pagination: IPage.IPagination = {
    current: validatedPage,
    limit: validatedLimit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / validatedLimit),
  } satisfies IPage.IPagination;
  return {
    data: transformedData,
    pagination,
  } satisfies IPageIEcommerceMallCategory.ISummary;
}
