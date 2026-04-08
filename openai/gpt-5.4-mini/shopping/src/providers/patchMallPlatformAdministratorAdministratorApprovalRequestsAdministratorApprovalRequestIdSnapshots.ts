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

export async function patchMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  administratorApprovalRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformAdministratorApprovalRequestSnapshot.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequestSnapshot.ISummary> {
  await MyGlobal.prisma.mall_platform_administrator_approval_requests.findUniqueOrThrow(
    {
      where: { id: props.administratorApprovalRequestId },
      select: { id: true },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const and: Prisma.mall_platform_administrator_approval_request_snapshotsWhereInput[] =
    [];
  if (props.body.search !== undefined) {
    and.push({
      snapshot_reason: {
        contains: props.body.search,
        mode: "insensitive",
      },
    });
  }
  if (props.body.snapshotReason !== undefined) {
    and.push({
      snapshot_reason: {
        contains: props.body.snapshotReason,
        mode: "insensitive",
      },
    });
  }
  if (props.body.createdFrom !== undefined) {
    and.push({
      created_at: {
        gte: props.body.createdFrom,
      },
    });
  }
  if (props.body.createdTo !== undefined) {
    and.push({
      created_at: {
        lte: props.body.createdTo,
      },
    });
  }
  const where: Prisma.mall_platform_administrator_approval_request_snapshotsWhereInput =
    {
      administrator_approval_request_id: props.administratorApprovalRequestId,
      ...(and.length > 0 ? { AND: and } : {}),
    };
  const records =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: [{ created_at: "asc" }, { id: "asc" }],
        ...MallPlatformAdministratorApprovalRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_administrator_approval_request_snapshots.count(
      {
        where,
      },
    );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// export async function patchMallPlatformAdministratorAdministratorApprovalRequestsAdministratorApprovalRequestIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   administratorApprovalRequestId: string & tags.Format<"uuid">;
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