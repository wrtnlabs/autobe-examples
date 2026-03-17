import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
  const sortField = props.body.sortField ?? "created_at";
  const sortDirection = props.body.sortDirection ?? "desc";
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filters
  const whereInput = {
    // Soft delete filter - exclude deleted unless explicitly included
    ...(props.body.includeDeleted !== true && { deleted_at: null }),
    // Parent filter - handle undefined (all), null (top-level), or specific UUID
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    // Search filter - case-insensitive partial match on name
    ...(props.body.search && {
      name: { contains: props.body.search, mode: "insensitive" as const },
    }),
  } satisfies Prisma.ecommerce_mall_categoriesWhereInput;
  // Build ORDER BY based on sort parameters
  const orderByInput = (
    sortField === "name"
      ? { name: sortDirection }
      : sortField === "updated_at"
        ? { updated_at: sortDirection }
        : { created_at: sortDirection }
  ) satisfies Prisma.ecommerce_mall_categoriesOrderByWithRelationInput;
  // Execute count and findMany (sequential for clarity)
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
  });
  // Transform records to DTO
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCategoryAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
