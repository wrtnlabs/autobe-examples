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
  const seller = await MyGlobal.prisma.mall_platform_sellers.findFirst({
    where: {
      id: props.seller.id,
    },
    select: {
      id: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const order = props.body.order ?? "desc";
  const sort = props.body.sort ?? "createdAt";
  if (
    sort !== "createdAt" &&
    sort !== "updatedAt" &&
    sort !== "reviewedAt" &&
    sort !== "status" &&
    sort !== "reason" &&
    sort !== "rejectionReason"
  ) {
    throw new HttpException("Unsupported sort key", 400);
  }
  const where = {
    deleted_at: null,
    ...(props.body.status === undefined || props.body.status === ""
      ? {}
      : { status: props.body.status }),
    ...(props.body.search === undefined || props.body.search === ""
      ? {}
      : {
          OR: [
            { reason: { contains: props.body.search } },
            { status: { contains: props.body.search } },
            { rejection_reason: { contains: props.body.search } },
          ],
        }),
  } satisfies Prisma.mall_platform_administrator_approval_requestsWhereInput;
  const orderBy = (
    sort === "status"
      ? [
          { status: order },
          { created_at: "desc" as const },
          { id: "desc" as const },
        ]
      : sort === "updatedAt"
        ? [
            { updated_at: order },
            { created_at: "desc" as const },
            { id: "desc" as const },
          ]
        : sort === "reviewedAt"
          ? [
              { reviewed_at: order },
              { created_at: "desc" as const },
              { id: "desc" as const },
            ]
          : sort === "reason"
            ? [
                { reason: order },
                { created_at: "desc" as const },
                { id: "desc" as const },
              ]
            : sort === "rejectionReason"
              ? [
                  { rejection_reason: order },
                  { created_at: "desc" as const },
                  { id: "desc" as const },
                ]
              : [{ created_at: order }, { id: "desc" as const }]
  ) satisfies Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput[];
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
      pages: total === 0 ? 0 : Math.ceil(total / limit),
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