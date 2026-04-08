import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdInventoryHistory(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const pageRaw = props.body.page ?? 1;
  const page = pageRaw === null ? 1 : pageRaw;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate seller owns the product and variant belongs to product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Forbidden", 403);
  }
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Build WHERE clause for inventory records
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput = {
    productVariant: { id: props.variantId },
    deleted_at: null,
    ...(props.body.operationType !== undefined
      ? {
          operation_type: props.body.operationType,
        }
      : {}),
    ...(props.body.fromDate !== undefined
      ? {
          created_at: { gte: new Date(props.body.fromDate) },
        }
      : {}),
    ...(props.body.toDate !== undefined
      ? {
          created_at: { lte: new Date(props.body.toDate) },
        }
      : {}),
    ...(props.body.minQuantity !== undefined
      ? {
          quantity_change: { gte: props.body.minQuantity },
        }
      : {}),
    ...(props.body.maxQuantity !== undefined
      ? {
          quantity_change: { lte: props.body.maxQuantity },
        }
      : {}),
  };
  // Build ORDER BY clause
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_inventory_recordsOrderByWithRelationInput =
    sortBy === "quantity_change"
      ? {
          quantity_change: (sortOrder === "asc" ? "asc" : "desc") as
            | "asc"
            | "desc",
        }
      : sortBy === "operation_type"
        ? {
            operation_type: (sortOrder === "asc" ? "asc" : "desc") as
              | "asc"
              | "desc",
          }
        : {
            created_at: (sortOrder === "asc" ? "asc" : "desc") as
              | "asc"
              | "desc",
          };
  // Query records and total count
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_inventory_records.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdInventoryHistory(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
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