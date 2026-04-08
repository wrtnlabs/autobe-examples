import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_productsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.category_id && {
      category_id: props.body.category_id,
    }),
    ...(props.body.min_price !== undefined && {
      base_price: {
        gte: props.body.min_price,
      },
    }),
    ...(props.body.max_price !== undefined && {
      base_price: {
        ...(props.body.min_price !== undefined
          ? { gte: props.body.min_price }
          : {}),
        lte: props.body.max_price,
      },
    }),
    ...(props.body.seller_id && {
      seller_id: props.body.seller_id,
    }),
  };
  // Build orderBy clause
  const orderByInput: Prisma.ecommerce_productsOrderByWithRelationInput = props
    .body.sort_by
    ? {
        [props.body.sort_by]: props.body.sort_order ?? "desc",
      }
    : { created_at: "desc" };
  // Fetch products with pagination
  const records = await MyGlobal.prisma.ecommerce_products.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceProductAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_products.count({
    where: whereInput,
  });
  // Transform records and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceProductAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceProduct.ISummary;
}
