import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "../transformers/EcommerceMallInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminInventoryRecords(props: {
  admin: AdminPayload;
  body: IEcommerceMallInventoryRecord.IRequest;
}): Promise<IPageIEcommerceMallInventoryRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const andConditions: Prisma.ecommerce_mall_inventory_recordsWhereInput[] = [];
  if (props.body.variantId !== null && props.body.variantId !== undefined) {
    andConditions.push({ product_variant_id: props.body.variantId });
  }
  if (props.body.reason !== null && props.body.reason !== undefined) {
    andConditions.push({ reason: props.body.reason });
  }
  if (
    props.body.dateRangeFrom !== null &&
    props.body.dateRangeFrom !== undefined
  ) {
    andConditions.push({
      created_at: { gte: new Date(props.body.dateRangeFrom) },
    });
  }
  if (props.body.dateRangeTo !== null && props.body.dateRangeTo !== undefined) {
    andConditions.push({
      created_at: { lte: new Date(props.body.dateRangeTo) },
    });
  }
  if (props.body.quantityDirection === "positive") {
    andConditions.push({ quantity_change: { gt: 0 } });
  } else if (props.body.quantityDirection === "negative") {
    andConditions.push({ quantity_change: { lt: 0 } });
  }
  if (props.body.productId !== null && props.body.productId !== undefined) {
    andConditions.push({
      variant: {
        product_id: props.body.productId,
      },
    });
  }
  const whereInput: Prisma.ecommerce_mall_inventory_recordsWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};
  const total = await MyGlobal.prisma.ecommerce_mall_inventory_records.count({
    where: whereInput,
  });
  const sortDirection: Prisma.SortOrder =
    props.body.sortDirection === "asc" ? "asc" : "desc";
  const records =
    await MyGlobal.prisma.ecommerce_mall_inventory_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: sortDirection },
      ...EcommerceMallInventoryRecordAtSummaryTransformer.select(),
    });
  const pages = Math.ceil(total / limit) || 0;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
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
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminInventoryRecords(props: {
//   admin: AdminPayload;
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