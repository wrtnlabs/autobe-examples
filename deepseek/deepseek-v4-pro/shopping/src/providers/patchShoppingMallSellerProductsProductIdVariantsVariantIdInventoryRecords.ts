import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        deleted_at: true,
      },
    });
  if (variant.deleted_at !== null) {
    throw new HttpException("Variant not found", 404);
  }
  if (variant.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Variant does not belong to this product", 404);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: variant.shopping_mall_product_id },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const hasDateFilter =
    props.body.from !== undefined || props.body.to !== undefined;
  const signFilter: "positive" | "negative" | undefined =
    props.body.sign === "positive" || props.body.sign === "negative"
      ? props.body.sign
      : undefined;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(hasDateFilter
      ? {
          created_at: {
            ...(props.body.from !== undefined ? { gte: props.body.from } : {}),
            ...(props.body.to !== undefined ? { lte: props.body.to } : {}),
          },
        }
      : {}),
    ...(signFilter === "positive"
      ? { quantity_change: { gt: 0 } }
      : signFilter === "negative"
        ? { quantity_change: { lt: 0 } }
        : {}),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallInventoryRecordAtSummaryTransformer.transform,
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
// import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
// import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IShoppingMallInventoryRecord.IRequest;
// }): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
//     ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallInventoryRecordAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------