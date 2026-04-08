import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer } from "../transformers/EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorAdminRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallAdministratorApprovalRequests.IRequest;
}): Promise<IPageIEcommerceMallAdministratorApprovalRequests.ISummary> {
  const cursor = props.body.cursor;
  const page = props.body.page;
  const limit = props.body.limit ?? 20;
  const sortOrder = props.body.sortOrder ?? "newest_first";
  const fromDate = props.body.fromDate;
  const toDate = props.body.toDate;
  const validatedLimit: number & tags.Type<"int32"> & tags.Minimum<0> =
    Math.min(100, Math.max(1, limit)) satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>;
  const whereInput: Prisma.ecommerce_mall_administrator_approval_requestsWhereInput =
    {
      status: "pending",
      deleted_at: null,
    };
  if (fromDate !== undefined && toDate !== undefined) {
    whereInput.created_at = { gte: fromDate, lte: toDate };
  } else if (fromDate !== undefined) {
    whereInput.created_at = { gte: fromDate };
  } else if (toDate !== undefined) {
    whereInput.created_at = { lte: toDate };
  }
  if (cursor) {
    if (sortOrder === "newest_first") {
      whereInput.id = { lt: cursor };
    } else {
      whereInput.id = { gt: cursor };
    }
  }
  const orderByInput: Prisma.ecommerce_mall_administrator_approval_requestsOrderByWithRelationInput[] =
    sortOrder === "newest_first"
      ? [{ created_at: "desc" }]
      : [{ created_at: "asc" }];
  const records =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findMany(
      {
        where: whereInput,
        orderBy: orderByInput,
        ...EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
        take: validatedLimit,
      } satisfies Prisma.ecommerce_mall_administrator_approval_requestsFindManyArgs,
    );
  const totalCountWhereInput: Prisma.ecommerce_mall_administrator_approval_requestsWhereInput =
    {
      status: "pending",
      deleted_at: null,
    };
  if (fromDate !== undefined && toDate !== undefined) {
    totalCountWhereInput.created_at = { gte: fromDate, lte: toDate };
  } else if (fromDate !== undefined) {
    totalCountWhereInput.created_at = { gte: fromDate };
  } else if (toDate !== undefined) {
    totalCountWhereInput.created_at = { lte: toDate };
  }
  const total =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.count({
      where: totalCountWhereInput,
    });
  const currentPage: number = page !== undefined && page !== null ? page : 1;
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> =
    total > 0 ? Math.ceil(total / validatedLimit) : 0;
  return {
    pagination: {
      current: currentPage satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: validatedLimit satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total,
      pages: pages satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallAdministratorApprovalRequests.ISummary;
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
// import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
// import { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorAdminRequests(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallAdministratorApprovalRequests.IRequest;
// }): Promise<IPageIEcommerceMallAdministratorApprovalRequests.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findMany({
//     ...EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------