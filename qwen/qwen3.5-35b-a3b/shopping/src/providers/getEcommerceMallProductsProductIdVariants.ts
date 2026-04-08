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

export async function getEcommerceMallProductsProductIdVariants(props: {
  productId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIEcommerceMallProductVariant.ISummary> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 20;
  const skip = (page - 1) * limit;
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: {
      id: props.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  const [variants, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variants.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: [{ stock_quantity: "desc" }, { created_at: "asc" }],
      skip,
      take: limit,
      ...EcommerceMallProductVariantAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_variants.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
    }),
  ]);
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data: await ArrayUtil.asyncMap(
      variants,
      EcommerceMallProductVariantAtSummaryTransformer.transform,
    ),
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
// import { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallProductsProductIdVariants(props: {
//   productId: string & tags.Format<"uuid">;
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