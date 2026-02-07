import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductAtSummaryTransformer } from "../transformers/EcommerceProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProducts(props: {
  body: IEcommerceProduct.IRequest;
}): Promise<IPageIEcommerceProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions for filtering
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search, mode: "insensitive" } },
        { description: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.category_id && { categories_id: props.body.category_id }),
    ...(props.body.min_price !== undefined && {
      base_price: { gte: props.body.min_price },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: { lte: props.body.max_price },
    }),
  } satisfies Prisma.ecommerce_productsWhereInput;
  // Get products with pagination
  const data = await MyGlobal.prisma.ecommerce_products.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: getOrderBy(props.body),
    ...EcommerceProductAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_products.count({
    where: whereInput,
  });
  // Transform results to summary format
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceProductAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } as IPageIEcommerceProduct.ISummary;
}
function getOrderBy(body: IEcommerceProduct.IRequest) {
  if (!body.sort_field || !body.sort_direction) {
    return { created_at: "desc" as const };
  }
  // Map sort_field to database column
  const orderByField = body.sort_field === "price" ? "base_price" : "name";
  return {
    [orderByField]: body.sort_direction as "asc" | "desc",
  } satisfies Prisma.ecommerce_productsOrderByWithRelationInput;
}
