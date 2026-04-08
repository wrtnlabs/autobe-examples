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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorOrderSnapshots(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where: Prisma.ecommerce_mall_order_snapshotsWhereInput = {};
  if (props.body.search !== undefined && props.body.search.length > 0) {
    where.order_number = { contains: props.body.search, mode: "insensitive" };
  }
  // Combine order_date filters using toISOStringSafe
  const orderDateFilter: Prisma.DateTimeFilter = {};
  if (props.body.order_date_start !== undefined) {
    orderDateFilter.gte = toISOStringSafe(props.body.order_date_start);
  }
  if (props.body.order_date_end !== undefined) {
    orderDateFilter.lte = toISOStringSafe(props.body.order_date_end);
  }
  if (Object.keys(orderDateFilter).length > 0) {
    where.order_date = orderDateFilter;
  }
  // Build orderBy with safe field mapping
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderBy: Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput[] =
    [
      {
        [sortField]: sortOrder,
      },
    ];
  // Query records
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_snapshots.count({ where }),
  ]);
  const data = await ArrayUtil.asyncMap(
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
    data,
  } satisfies IPageIEcommerceMallOrderSnapshot.ISummary;
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
// export async function patchEcommerceMallAdministratorOrderSnapshots(props: {
//   administrator: AdministratorPayload;
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