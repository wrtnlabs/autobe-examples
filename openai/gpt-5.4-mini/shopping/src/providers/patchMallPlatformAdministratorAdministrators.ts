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

export async function patchMallPlatformAdministratorAdministrators(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformAdministratorApprovalRequest.IRequest;
}): Promise<IPageIMallPlatformAdministratorApprovalRequest.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const search: string | undefined = props.body.search?.trim() || undefined;
  const status: string | undefined = props.body.status?.trim() || undefined;
  const order: "asc" | "desc" = props.body.order ?? "desc";
  if (page < 1) throw new HttpException("Invalid page", 400);
  if (limit < 1) throw new HttpException("Invalid limit", 400);
  const sortKey: string = props.body.sort ?? "createdAt";
  if (
    sortKey !== "createdAt" &&
    sortKey !== "updatedAt" &&
    sortKey !== "reviewedAt" &&
    sortKey !== "status"
  ) {
    throw new HttpException("Unsupported sort field", 400);
  }
  const sort: Prisma.mall_platform_administrator_approval_requestsOrderByWithRelationInput =
    sortKey === "status"
      ? { status: order }
      : sortKey === "reviewedAt"
        ? { reviewed_at: order }
        : sortKey === "updatedAt"
          ? { updated_at: order }
          : { created_at: order };
  const where: Prisma.mall_platform_administrator_approval_requestsWhereInput =
    {
      deleted_at: null,
      ...(status !== undefined ? { status } : {}),
      ...(search !== undefined
        ? {
            OR: [
              { reason: { contains: search, mode: "insensitive" } },
              { rejection_reason: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
  const records =
    await MyGlobal.prisma.mall_platform_administrator_approval_requests.findMany(
      {
        where,
        orderBy: [sort, { id: "desc" }],
        skip: (page - 1) * limit,
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
// export async function patchMallPlatformAdministratorAdministrators(props: {
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