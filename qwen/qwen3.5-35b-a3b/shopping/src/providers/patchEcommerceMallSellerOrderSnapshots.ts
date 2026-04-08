import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderSnapshots(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_snapshotsWhereInput = {};
  if (props.body.search) {
    whereInput.order_number = {
      contains: props.body.search,
    };
  }
  if (props.body.entity_type) {
    // entity_type filter is not available on order_snapshots table
    // This field was intended for filtering by entity type (PRODUCT, ORDER_ITEM, etc.)
    // but order_snapshots table only has denormalized order data without entity_type column
    // No filter applied for entity_type
  }
  if (props.body.order_date_start || props.body.order_date_end) {
    const orderDateFilter: Prisma.DateTimeFilter = {};
    if (props.body.order_date_start) {
      orderDateFilter.gte = props.body.order_date_start as string &
        tags.Format<"date-time">;
    }
    if (props.body.order_date_end) {
      orderDateFilter.lte = props.body.order_date_end as string &
        tags.Format<"date-time">;
    }
    whereInput.order_date = orderDateFilter;
  }
  if (props.body.entity_status) {
    whereInput.order_status = {
      equals: props.body.entity_status,
    };
  }
  const validSortFields: ReadonlyArray<
    keyof Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput
  > = [
    "id",
    "order_number",
    "order_date",
    "customer_name",
    "customer_phone",
    "shipping_recipient_name",
    "shipping_phone",
    "shipping_street",
    "shipping_city",
    "shipping_state",
    "shipping_postal_code",
    "shipping_country",
    "item_count",
    "subtotal",
    "shipping_fee",
    "total_amount",
    "order_status",
  ];
  const sortField: keyof Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput =
    props.body.sort_by && validSortFields.includes(props.body.sort_by as any)
      ? (props.body
          .sort_by as keyof Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput)
      : "order_date";
  const sortOrder: "asc" | "desc" =
    props.body.sort_order === "asc" ? "asc" : "desc";
  const orderByInput: Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
  const records = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_order_snapshots.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    records,
    EcommerceMallOrderSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
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
// import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
// import { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellerOrderSnapshots(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallOrderSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany({
//     ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallOrderSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------