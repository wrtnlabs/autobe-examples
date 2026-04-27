import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallProductAtSummaryTransformer } from "../transformers/ECommerceMallProductAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerProducts(props: {
  customer: CustomerPayload;
  body: IECommerceMallProduct.IRequest;
}): Promise<IPageIECommerceMallProduct.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_productsWhereInput = {
    visibility: "visible",
    deleted_at: null,
  };
  if (props.body.search !== undefined) {
    where.name = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.categoryId !== undefined) {
    where.category_id = props.body.categoryId;
  }
  if (props.body.minPrice !== undefined || props.body.maxPrice !== undefined) {
    const basePriceFilter: Prisma.FloatFilter = {};
    if (props.body.minPrice !== undefined) {
      basePriceFilter.gte = props.body.minPrice;
    }
    if (props.body.maxPrice !== undefined) {
      basePriceFilter.lte = props.body.maxPrice;
    }
    where.base_price = basePriceFilter;
  }
  if (props.body.inStockOnly === true) {
    const variantIdsWithStock =
      await MyGlobal.prisma.e_commerce_mall_inventory_records.groupBy({
        by: ["e_commerce_mall_product_variant_id"],
        _sum: { quantity_change: true },
        having: {
          quantity_change: { _sum: { gt: 0 } },
        },
      });
    where.variants = {
      some: {
        id: {
          in: variantIdsWithStock.map(
            (v) => v.e_commerce_mall_product_variant_id,
          ),
        },
        deleted_at: null,
      },
    };
  }
  const orderBy: Prisma.e_commerce_mall_productsOrderByWithRelationInput =
    props.body.sort === "price_asc"
      ? { base_price: "asc" }
      : props.body.sort === "price_desc"
        ? { base_price: "desc" }
        : { created_at: "desc" };
  const data = await MyGlobal.prisma.e_commerce_mall_products.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ECommerceMallProductAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.e_commerce_mall_products.count({
    where,
  });
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ECommerceMallProductAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
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
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IPageIECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProduct";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerProducts(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallProduct.IRequest;
// }): Promise<IPageIECommerceMallProduct.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_products.findMany({
//     ...ECommerceMallProductAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallProductAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------