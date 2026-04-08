import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellersMeVariantsVariantIdInventoryHistory(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  // Verify variant exists and belongs to seller's product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (!variant) {
    throw new HttpException("Variant not found", 404);
  }
  // Verify product belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: variant.ecommerce_mall_product_id },
    select: { ecommerce_mall_seller_id: true },
  });
  if (!product || product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput = {
    ecommerce_mall_product_variant_id: props.variantId,
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(props.body.startDate !== undefined && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate !== undefined && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  // Query inventory records with pagination
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
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
      records,
      EcommerceMallInventoryRecordAtSummaryTransformer.transform,
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
// import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
// import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerSellersMeVariantsVariantIdInventoryHistory(props: {
//   seller: SellerPayload;
//   variantId: string & tags.Format<"uuid">;
//   body: IEcommerceMallInventoryRecord.IRequest;
// }): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
//     ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallInventoryRecordAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------