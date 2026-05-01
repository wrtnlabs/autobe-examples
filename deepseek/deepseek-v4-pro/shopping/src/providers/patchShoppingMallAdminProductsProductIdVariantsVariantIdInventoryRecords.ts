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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallInventoryRecordAtSummaryTransformer } from "../transformers/ShoppingMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminProductsProductIdVariantsVariantIdInventoryRecords(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord.ISummary> {
  // Verify variant exists, is not soft-deleted, and belongs to the given product
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.variantId,
      deleted_at: null,
      shopping_mall_product_id: props.productId,
    },
  });
  // Admin access — no ownership restriction; skip seller verification
  // Build where filter with optional date range and sign conditions
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    ...(props.body.from || props.body.to
      ? {
          created_at: {
            ...(props.body.from ? { gte: props.body.from } : {}),
            ...(props.body.to ? { lte: props.body.to } : {}),
          },
        }
      : {}),
    ...(props.body.sign === "positive" ? { quantity_change: { gt: 0 } } : {}),
    ...(props.body.sign === "negative" ? { quantity_change: { lt: 0 } } : {}),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sequential queries (NOT Promise.all per convention)
  const data = await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
    where: whereInput,
    ...ShoppingMallInventoryRecordAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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
// export async function patchShoppingMallAdminProductsProductIdVariantsVariantIdInventoryRecords(props: {
//   admin: AdminPayload;
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