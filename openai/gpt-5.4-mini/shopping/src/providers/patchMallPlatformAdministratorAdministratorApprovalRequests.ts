import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformAdministratorApprovalRequestAtSummaryTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorAdministratorApprovalRequests(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministratorApprovalRequest.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.mall_platform_administrator_approval_requestsWhereInput =
    {
      deleted_at: null,
      ...(props.body.administratorId !== undefined && {
        administrator_id: props.body.administratorId,
      }),
      ...(props.body.reviewerAdministratorId !== undefined && {
        reviewer_administrator_id: props.body.reviewerAdministratorId,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      ...(props.body.reason !== undefined && {
        reason: { contains: props.body.reason, mode: "insensitive" },
      }),
      ...(props.body.rejectionReason !== undefined && {
        rejection_reason: {
          contains: props.body.rejectionReason,
          mode: "insensitive",
        },
      }),
    } satisfies Prisma.mall_platform_administrator_approval_requestsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        ...MallPlatformAdministratorApprovalRequestAtSummaryTransformer.select(),
      },
    );
  const recordsCount =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformAdministratorApprovalRequestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMallPlatformAdministratorApprovalRequest.ISummary;
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
// import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
// import { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorAdministratorApprovalRequests(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformAdministratorApprovalRequest.IRequest;
// }): Promise<IPageIMallPlatformAdministratorApprovalRequest.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_administrator_approval_requests.findMany({
//     ...MallPlatformAdministratorApprovalRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformAdministratorApprovalRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------