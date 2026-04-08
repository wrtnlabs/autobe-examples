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

export async function patchEcommerceMallSuperAdministratorAdministrationRequests(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallAdministratorApprovalRequests.IRequest;
}): Promise<IPageIEcommerceMallAdministratorApprovalRequests.ISummary> {
  const page = props.body.page ?? undefined;
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor ?? undefined;
  const sortOrder = props.body.sortOrder ?? ("newest_first" as const);
  const status = props.body.status ?? undefined;
  const fromDate = props.body.fromDate ?? undefined;
  const toDate = props.body.toDate ?? undefined;
  const baseWhere: Prisma.ecommerce_mall_administrator_approval_requestsWhereInput =
    {
      deleted_at: null,
    };
  if (status) {
    baseWhere.status = Array.isArray(status) ? { in: status } : status;
  }
  if (fromDate || toDate) {
    baseWhere.created_at =
      {} as Prisma.DateTimeFilter<"ecommerce_mall_administrator_approval_requests">;
    if (fromDate) {
      baseWhere.created_at.gte = new Date(fromDate);
    }
    if (toDate) {
      baseWhere.created_at.lte = new Date(toDate);
    }
  }
  if (cursor) {
    const cursorId = cursor as string & tags.Format<"uuid">;
    if (sortOrder === "newest_first") {
      baseWhere.id = { lt: cursorId };
    } else {
      baseWhere.id = { gt: cursorId };
    }
  }
  const orderBy =
    sortOrder === "newest_first"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const };
  const records =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.findMany(
      {
        where: baseWhere,
        orderBy,
        ...EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.select(),
        take: limit + 1,
        ...(cursor && sortOrder === "newest_first" ? { skip: 1 } : undefined),
      },
    );
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const total =
    await MyGlobal.prisma.ecommerce_mall_administrator_approval_requests.count({
      where: baseWhere,
    });
  const currentPage = page ?? 1;
  const nextCursor = hasMore ? data[data.length - 1].id : undefined;
  return {
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallAdministratorApprovalRequestsAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministratorApprovalRequests";
// import { IPageIEcommerceMallAdministratorApprovalRequests } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdministratorApprovalRequests";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorAdministrationRequests(props: {
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