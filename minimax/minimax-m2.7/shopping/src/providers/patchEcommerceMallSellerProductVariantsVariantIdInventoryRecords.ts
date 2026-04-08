import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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

export async function patchEcommerceMallSellerProductVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (variant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: variant.ecommerce_mall_product_id },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (
    product === null ||
    product.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException(
      "You do not have permission to view this variant inventory",
      403,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_mall_product_variant_id: props.variantId,
    ...(props.body.fromDate && {
      created_at: {
        gte: new Date(props.body.fromDate as string & tags.Format<"date-time">),
      },
    }),
    ...(props.body.toDate && {
      created_at: {
        lte: new Date(props.body.toDate as string & tags.Format<"date-time">),
      },
    }),
  } satisfies Prisma.ecommerce_mall_inventory_recordsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    pagination: {
      pagination: {
        current: page satisfies number as number,
        limit: limit satisfies number as number,
        records: total satisfies number as number,
        pages: Math.ceil(total / limit) satisfies number as number,
      },
      data: [],
    } satisfies IPageIEcommerceMall.IPagination,
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
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerProductVariantsVariantIdInventoryRecords(props: {
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