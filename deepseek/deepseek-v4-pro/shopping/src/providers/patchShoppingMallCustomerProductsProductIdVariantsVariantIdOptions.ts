import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOptionValue";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallProductVariantOptionValueAtSummaryTransformer } from "../transformers/ShoppingMallProductVariantOptionValueAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerProductsProductIdVariantsVariantIdOptions(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantOptionValue.IRequest;
}): Promise<IPageIShoppingMallProductVariantOptionValue.ISummary> {
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderBy = (
    props.body.sort === "key_desc" ? { key: "desc" } : { key: "asc" }
  ) satisfies Prisma.shopping_mall_product_variant_option_valuesOrderByWithRelationInput;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.keys !== undefined && { key: { in: props.body.keys } }),
  } satisfies Prisma.shopping_mall_product_variant_option_valuesWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.findMany({
      where: whereInput,
      orderBy,
      skip,
      take: limit,
      ...ShoppingMallProductVariantOptionValueAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.shopping_mall_product_variant_option_values.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallProductVariantOptionValueAtSummaryTransformer.transform,
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
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IPageIShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOptionValue";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerProductsProductIdVariantsVariantIdOptions(props: {
//   customer: CustomerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductVariantOptionValue.IRequest;
// }): Promise<IPageIShoppingMallProductVariantOptionValue.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_product_variant_option_values.findMany({
//     ...ShoppingMallProductVariantOptionValueAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallProductVariantOptionValueAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------