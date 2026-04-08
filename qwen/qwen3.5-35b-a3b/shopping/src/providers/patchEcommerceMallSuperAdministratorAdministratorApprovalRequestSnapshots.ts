import { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorAdministratorApprovalRequestSnapshots(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallAdministratorApprovalRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdministratorApprovalRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_administrator_approval_requests_snapshotsWhereInput =
    {
      ...(props.body.requester_type !== undefined && {
        requester_type: props.body.requester_type,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.reviewer_id !== undefined && {
        reviewed_by_administrator_id: props.body.reviewer_id,
      }),
      ...(props.body.created_at_min !== undefined && {
        created_at: { gte: props.body.created_at_min },
      }),
      ...(props.body.created_at_max !== undefined && {
        created_at: { lte: props.body.created_at_max },
      }),
    };
  const orderValue: Prisma.SortOrder =
    props.body.order === "desc" ? "desc" : "asc";
  const orderBy =
    props.body.sort === "created_at"
      ? { created_at: orderValue }
      : props.body.sort === "requester_type"
        ? { requester_type: orderValue }
        : props.body.sort === "status"
          ? { status: orderValue }
          : { created_at: "desc" as Prisma.SortOrder };
  const orderByInput =
    orderBy satisfies Prisma.ecommerce_mall_administrator_approval_requests_snapshotsOrderByWithRelationInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_administrator_approval_requests_snapshots.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        skip,
        take: limit,
        ...EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer.select(),
      },
    ),
    MyGlobal.prisma.ecommerce_mall_administrator_approval_requests_snapshots.count(
      {
        where: whereInput,
      },
    ),
  ]);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequestSnapshot";
// import { IPageIEcommerceMallAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
// import { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorAdministratorApprovalRequestSnapshots(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallAdministratorApprovalRequestSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallAdministratorApprovalRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests_snapshots.findMany({
//     ...EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdministratorApprovalRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------