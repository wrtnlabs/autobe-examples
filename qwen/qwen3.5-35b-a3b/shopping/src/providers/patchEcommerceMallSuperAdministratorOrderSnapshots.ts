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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallOrderSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallOrderSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorOrderSnapshots(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_snapshotsWhereInput = {
    ...(props.body.search && {
      order_number: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.entity_status && { order_status: props.body.entity_status }),
    ...(props.body.order_date_start && {
      order_date: {
        gte: new Date(props.body.order_date_start),
      },
    }),
    ...(props.body.order_date_end && {
      order_date: {
        lte: new Date(props.body.order_date_end),
      },
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput[] =
    props.body.sort_by === "created_at"
      ? [{ order_date: props.body.sort_order ?? ("desc" as const) }]
      : props.body.sort_by === "order_date"
        ? [{ order_date: props.body.sort_order ?? ("desc" as const) }]
        : props.body.sort_by === "entity_name"
          ? [{ order_number: props.body.sort_order ?? ("desc" as const) }]
          : [{ order_date: "desc" as const }];
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_snapshots.count({ where: whereInput }),
  ]);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorOrderSnapshots(props: {
//   superAdministrator: SuperadministratorPayload;
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