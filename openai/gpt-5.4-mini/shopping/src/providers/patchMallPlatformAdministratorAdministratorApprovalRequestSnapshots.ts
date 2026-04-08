import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorAdministratorApprovalRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministratorApprovalRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequestSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_administrator_approval_request_snapshotsWhereInput =
    {
      ...(props.body.administratorApprovalRequestId !== undefined && {
        administrator_approval_request_id:
          props.body.administratorApprovalRequestId,
      }),
      ...(props.body.snapshotReason !== undefined && {
        snapshot_reason: { contains: props.body.snapshotReason },
      }),
      ...(props.body.createdAtFrom !== undefined && {
        created_at: { gte: props.body.createdAtFrom },
      }),
      ...(props.body.createdAtTo !== undefined && {
        created_at: { lte: props.body.createdAtTo },
      }),
    };
  const orderBy: Prisma.mall_platform_administrator_approval_request_snapshotsOrderByWithRelationInput[] =
    props.body.sort === "oldest"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : [{ created_at: "desc" }, { id: "desc" }];
  const records =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const recordsCount =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.count(
      {
        where,
      },
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer.transform,
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
// import { IMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequestSnapshot";
// import { IPageIMallPlatformAdministratorApprovalRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequestSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorAdministratorApprovalRequestSnapshots(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformAdministratorApprovalRequestSnapshot.IRequest;
// }): Promise<IPageIMallPlatformAdministratorApprovalRequestSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findMany({
//     ...MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------