import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariant.IRequest;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.ecommerce_mall_product_variantsWhereInput = {
    deleted_at: null,
    ecommerce_mall_product_id: props.productId,
    ...(props.body.skuCode && { sku_code: { contains: props.body.skuCode } }),
    ...(props.body.inStock === true && { quantity: { gt: 0 } }),
    ...(props.body.inStock === false && { quantity: { equals: 0 } }),
    ...(props.body.minPrice !== undefined && {
      price: { gte: props.body.minPrice },
    }),
    ...(props.body.maxPrice !== undefined && {
      price: { lte: props.body.maxPrice },
    }),
    ...(props.body.minStockQuantity !== undefined && {
      quantity: { gte: props.body.minStockQuantity },
    }),
    ...(props.body.maxStockQuantity !== undefined && {
      quantity: { lte: props.body.maxStockQuantity },
    }),
  };
  const orderBy = (
    props.body.sortBy === "quantity_asc"
      ? { quantity: "asc" as const }
      : props.body.sortBy === "quantity_desc"
        ? { quantity: "desc" as const }
        : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_product_variantsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_product_variants.count({
    where: whereCondition,
  });
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: [],
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallProductVariantAtSummaryTransformer.transform,
    ),
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdVariants(props: {
//   seller: SellerPayload;
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