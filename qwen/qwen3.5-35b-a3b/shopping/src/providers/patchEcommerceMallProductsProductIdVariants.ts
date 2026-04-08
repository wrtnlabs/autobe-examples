import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Base filter conditions
  const baseWhereConditions: Prisma.ecommerce_mall_product_variantsWhereInput =
    {
      product_id: props.productId,
      deleted_at: null,
    };
  // SKU code prefix filter (case-insensitive partial match)
  if (props.body.sku_code_prefix) {
    baseWhereConditions.sku_code = {
      contains: props.body.sku_code_prefix,
      mode: "insensitive",
    };
  }
  // Stock status filter
  if (props.body.stock_status === "in_stock") {
    baseWhereConditions.stock_quantity = { gt: 0 };
  } else if (props.body.stock_status === "out_of_stock") {
    baseWhereConditions.stock_quantity = { equals: 0 };
  }
  // Build price filter with OR condition - merge base filters into each OR branch
  if (
    props.body.min_price !== undefined ||
    props.body.max_price !== undefined
  ) {
    const priceFilterConditions: Prisma.ecommerce_mall_product_variantsWhereInput["AND"] =
      [];
    if (props.body.min_price !== undefined) {
      priceFilterConditions.push({ price: { gte: props.body.min_price } });
    }
    if (props.body.max_price !== undefined) {
      priceFilterConditions.push({ price: { lte: props.body.max_price } });
    }
    baseWhereConditions.OR = [
      // Variant has explicit price
      {
        AND: [{ price: { not: null } }, ...priceFilterConditions],
      },
      // Variant uses base price from product
      {
        AND: [
          { price: null },
          {
            product: {
              ...(props.body.min_price !== undefined
                ? { base_price: { gte: props.body.min_price } }
                : {}),
              ...(props.body.max_price !== undefined
                ? { base_price: { lte: props.body.max_price } }
                : {}),
            },
          },
        ],
      },
    ];
  }
  // Combine conditions
  const whereConditions: Prisma.ecommerce_mall_product_variantsWhereInput =
    baseWhereConditions;
  // Calculate pagination
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? props.body.limit ?? 100;
  const safePageSize = Math.min(pageSize, 100);
  const safePage = page < 1 ? 1 : page;
  const skip = (safePage - 1) * safePageSize;
  // Build sort order
  const sortField = props.body.sort_by;
  const sortOrder = props.body.sort_order ?? "asc";
  const orderByInput: Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput[] =
    [];
  if (sortField === "sku_code") {
    orderByInput.push({ sku_code: sortOrder });
  } else if (sortField === "price") {
    orderByInput.push({ price: sortOrder });
  } else if (sortField === "stock_quantity") {
    orderByInput.push({ stock_quantity: sortOrder });
  } else {
    orderByInput.push({ created_at: sortOrder });
  }
  // Fetch total count
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereConditions,
  });
  // Fetch records
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: whereConditions,
      skip,
      take: safePageSize,
      orderBy: orderByInput,
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallProductVariantAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: safePage,
      limit: safePageSize,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / safePageSize),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceMallProductVariant.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallProductsProductIdVariants(props: {
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductVariant.IRequest;
// }): Promise<IPageIEcommerceMallProductVariant.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
//     ...EcommerceMallProductVariantAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallProductVariantAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------