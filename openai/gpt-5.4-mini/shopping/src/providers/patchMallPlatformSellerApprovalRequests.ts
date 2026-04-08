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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformAdministratorApprovalRequestAtSummaryTransformer } from "../transformers/MallPlatformAdministratorApprovalRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerApprovalRequests(props: {
  seller: SellerPayload;
  body: IMallPlatformAdministratorApprovalRequest.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequest.ISummary> {
  if (props.body.page !== undefined && props.body.page < 1) {
    throw new HttpException("Page must be greater than or equal to 1", 400);
  }
  if (props.body.limit !== undefined && props.body.limit < 1) {
    throw new HttpException("Limit must be greater than or equal to 1", 400);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const createdAtFilter =
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          ...(props.body.createdAtFrom !== undefined
            ? { gte: new Date(props.body.createdAtFrom) }
            : {}),
          ...(props.body.createdAtTo !== undefined
            ? { lte: new Date(props.body.createdAtTo) }
            : {}),
        }
      : undefined;
  const reviewedAtFilter =
    props.body.reviewedAtFrom !== undefined ||
    props.body.reviewedAtTo !== undefined
      ? {
          ...(props.body.reviewedAtFrom !== undefined
            ? { gte: new Date(props.body.reviewedAtFrom) }
            : {}),
          ...(props.body.reviewedAtTo !== undefined
            ? { lte: new Date(props.body.reviewedAtTo) }
            : {}),
        }
      : undefined;
  const updatedAtFilter =
    props.body.updatedAtFrom !== undefined ||
    props.body.updatedAtTo !== undefined
      ? {
          ...(props.body.updatedAtFrom !== undefined
            ? { gte: new Date(props.body.updatedAtFrom) }
            : {}),
          ...(props.body.updatedAtTo !== undefined
            ? { lte: new Date(props.body.updatedAtTo) }
            : {}),
        }
      : undefined;
  const where = {
    ...(props.body.administratorId !== undefined
      ? { administrator_id: props.body.administratorId }
      : {}),
    ...(props.body.reviewerAdministratorId !== undefined
      ? { reviewer_administrator_id: props.body.reviewerAdministratorId }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.reason !== undefined
      ? { reason: { contains: props.body.reason, mode: "insensitive" } }
      : {}),
    ...(props.body.rejectionReason !== undefined
      ? {
          rejection_reason: {
            contains: props.body.rejectionReason,
            mode: "insensitive",
          },
        }
      : {}),
    ...(createdAtFilter !== undefined ? { created_at: createdAtFilter } : {}),
    ...(reviewedAtFilter !== undefined
      ? { reviewed_at: reviewedAtFilter }
      : {}),
    ...(updatedAtFilter !== undefined ? { updated_at: updatedAtFilter } : {}),
  } satisfies Prisma.mall_platform_administrator_approval_requestsWhereInput;
  const orderBy = [
    { created_at: "desc" },
    { status: "asc" },
  ] satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        ...MallPlatformAdministratorApprovalRequestAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformAdministratorApprovalRequestAtSummaryTransformer.transform,
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
// import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
// import { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerApprovalRequests(props: {
//   seller: SellerPayload;
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