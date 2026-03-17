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
  const pageSize = props.body.page_size ?? 100;
  const limit = Math.min(Math.max(pageSize, 1), 100);
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null, // Always exclude soft-deleted categories
  };
  // Apply search filters
  if (props.body.search_term) {
    whereInput.OR = [
      {
        name: {
          contains: props.body.search_term,
          mode: "insensitive",
        },
      },
      {
        slug: {
          contains: props.body.search_term,
          mode: "insensitive",
        },
      },
    ];
  }
  // Apply parent_id filter
  if (props.body.parent_id !== undefined) {
    whereInput.parent_id = props.body.parent_id;
  }
  // Apply is_active filter
  if (props.body.is_active !== undefined) {
    whereInput.is_active = props.body.is_active;
  }
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_mall_categoriesOrderByWithRelationInput[] =
    [
      {
        display_order: "asc",
      },
    ];
  if (props.body.sort_by === "name") {
    orderByInput[0] = {
      name: props.body.sort_order === "desc" ? "desc" : "asc",
    };
  } else if (props.body.sort_by === "created_at") {
    orderByInput[0] = {
      created_at: props.body.sort_order === "desc" ? "desc" : "asc",
    };
  }
  // Execute query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_categories.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallCategoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_categories.count({ where: whereInput }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCategoryAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallCategory.ISummary;
}
