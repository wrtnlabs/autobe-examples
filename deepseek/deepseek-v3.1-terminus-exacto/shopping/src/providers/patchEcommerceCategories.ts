import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCategoryAtSummaryTransformer } from "../transformers/EcommerceCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCategories(props: {
  body: IEcommerceCategory.IRequest;
}): Promise<IPageIEcommerceCategory.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where clause based on available filters from DTO
  const whereInput = {
    // Include both active and soft-deleted categories (no deleted_at filter)
    // Apply category_ids filter if provided
    ...(props.body.category_ids &&
      props.body.category_ids.length > 0 && {
        id: { in: props.body.category_ids },
      }),
    // Apply date range filtering if provided
    ...((props.body.start_date !== undefined ||
      props.body.end_date !== undefined) && {
      created_at: {
        ...(props.body.start_date !== undefined && {
          gte: new Date(props.body.start_date),
        }),
        ...(props.body.end_date !== undefined && {
          lte: new Date(props.body.end_date),
        }),
      },
    }),
  } satisfies Prisma.ecommerce_categoriesWhereInput;
  // Execute queries sequentially as required (not Promise.all)
  const data = await MyGlobal.prisma.ecommerce_categories.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    } as const satisfies Prisma.ecommerce_categoriesOrderByWithRelationInput,
    ...EcommerceCategoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_categories.count({
    where: whereInput,
  });
  // Transform data using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceCategoryAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
