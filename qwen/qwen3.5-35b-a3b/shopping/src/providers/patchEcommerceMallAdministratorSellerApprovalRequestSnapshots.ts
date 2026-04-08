import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorSellerApprovalRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallSellerApprovalRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallSellerApprovalRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_seller_approval_request_snapshotsWhereInput =
    {
      status: props.body.status,
      ...(props.body.approved_by_administrator_id && {
        approved_by_administrator_id: props.body.approved_by_administrator_id,
      }),
      snapshot_time: {
        ...(props.body.snapshot_time_min && {
          gte: new Date(props.body.snapshot_time_min),
        }),
        ...(props.body.snapshot_time_max && {
          lte: new Date(props.body.snapshot_time_max),
        }),
      },
      approved_at: {
        ...(props.body.approved_at_min && {
          gte: new Date(props.body.approved_at_min),
        }),
        ...(props.body.approved_at_max && {
          lte: new Date(props.body.approved_at_max),
        }),
      },
      rejected_at: {
        ...(props.body.rejected_at_min && {
          gte: new Date(props.body.rejected_at_min),
        }),
        ...(props.body.rejected_at_max && {
          lte: new Date(props.body.rejected_at_max),
        }),
      },
    };
  const orderByInput = (
    props.body.sort
      ? {
          [props.body.sort]: props.body.sortOrder === "ASC" ? "asc" : "desc",
        }
      : { snapshot_time: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_seller_approval_request_snapshotsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_seller_approval_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_seller_approval_request_snapshots.count({
      where: whereInput,
    }),
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
      EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequestSnapshot";
// import { IPageIEcommerceMallSellerApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorSellerApprovalRequestSnapshots(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallSellerApprovalRequestSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallSellerApprovalRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_seller_approval_request_snapshots.findMany({
//     ...EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerApprovalRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------