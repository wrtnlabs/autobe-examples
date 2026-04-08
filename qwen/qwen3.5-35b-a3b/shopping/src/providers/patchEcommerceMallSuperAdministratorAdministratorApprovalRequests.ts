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

export async function patchEcommerceMallSuperAdministratorAdministratorApprovalRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallAdministratorApprovalRequests.IRequest;
}): Promise<IPageIEcommerceMallAdministratorApprovalRequests.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page;
  const cursor = props.body.cursor;
  const sortOrder = props.body.sortOrder ?? "newest_first";
  const status = props.body.status;
  const fromDate = props.body.fromDate;
  const toDate = props.body.toDate;
  // Build WHERE conditions
  const where: Prisma.ecommerce_mall_administrator_approval_requestsWhereInput =
    {
      deleted_at: null,
      ...(status && { status: status }),
      ...(fromDate && { created_at: { gte: new Date(fromDate) } }),
      ...(toDate && { created_at: { lte: new Date(toDate) } }),
    } satisfies Prisma.ecommerce_mall_administrator_approval_requestsWhereInput;
  // Build ORDER BY
  const orderBy = (
    sortOrder === "oldest_first"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_administrator_approval_requestsOrderByWithRelationInput;
  // Calculate skip for page-based pagination
  const skip = page != null ? (page - 1) * limit : undefined;
  // Fetch total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.count({
      where,
    });
  // Determine pagination strategy and fetch records
  let records: Array<
    Prisma.ecommerce_mall_administrator_approval_requestsGetPayload<
      ReturnType<
        typeof EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select
      >
    >
  >;
  if (cursor) {
    // Cursor-based pagination
    records =
      await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findMany(
        {
          where: {
            ...where,
            ...(sortOrder === "newest_first"
              ? { id: { lt: cursor } }
              : { id: { gt: cursor } }),
          } satisfies Prisma.ecommerce_mall_administrator_approval_requestsWhereInput,
          ...EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
          orderBy,
          take: limit + 1,
        },
      );
  } else if (skip !== undefined) {
    // Page-based pagination
    records =
      await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findMany(
        {
          where,
          ...EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
          orderBy,
          skip,
          take: limit,
        },
      );
  } else {
    // Default: first page with no cursor
    records =
      await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findMany(
        {
          where,
          ...EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
          orderBy,
          take: limit + 1,
        },
      );
  }
  // Determine pagination metadata
  const hasMore = records.length > limit;
  if (hasMore) {
    records = records.slice(0, -1);
  }
  const lastRecord = records[records.length - 1];
  const nextCursor = hasMore ? lastRecord?.id : undefined;
  const currentPage = page ?? 1;
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
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
// export async function patchEcommerceMallSuperAdministratorAdministratorApprovalRequests(props: {
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