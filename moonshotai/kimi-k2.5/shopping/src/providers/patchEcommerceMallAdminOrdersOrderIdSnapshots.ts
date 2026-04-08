import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrdersOrderIdSnapshots(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.createdAtFrom !== null) {
    createdAtFilter.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== null) {
    createdAtFilter.lte = new Date(props.body.createdAtTo);
  }
  const whereInput: Prisma.ecommerce_mall_order_snapshotsWhereInput = {
    order_id: props.orderId,
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  };
  const records = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_order_snapshots.count({
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
      EcommerceMallOrderSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
// import { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminOrdersOrderIdSnapshots(props: {
//   admin: AdminPayload;
//   orderId: string;
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