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

export async function patchEcommerceMallAdministratorOrdersOrderIdSnapshots(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceMallOrderSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_snapshotsWhereInput = {
    ecommerce_mall_order_id: props.orderId,
    ...(props.body.search !== undefined
      ? {
          order_number: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {}),
    ...(props.body.order_date_start !== undefined
      ? {
          order_date: {
            gte: new Date(props.body.order_date_start),
          },
        }
      : {}),
    ...(props.body.order_date_end !== undefined
      ? {
          order_date: {
            lte: new Date(props.body.order_date_end),
          },
        }
      : {}),
  } satisfies Prisma.ecommerce_mall_order_snapshotsWhereInput;
  const orderByInput: Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput =
    (() => {
      const sortBy = props.body.sort_by ?? "order_date";
      const sortOrder = props.body.sort_order ?? "desc";
      if (sortBy === "order_date") {
        return { order_date: sortOrder };
      }
      if (sortBy === "customer_name") {
        return { customer_name: sortOrder };
      }
      if (sortBy === "item_count") {
        return { item_count: sortOrder };
      }
      return { order_date: "desc" as const };
    })() satisfies Prisma.ecommerce_mall_order_snapshotsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_mall_order_snapshots.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: [orderByInput],
      ...EcommerceMallOrderSnapshotAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_order_snapshots.count({
    where: whereInput,
  });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
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
// export async function patchEcommerceMallAdministratorOrdersOrderIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
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