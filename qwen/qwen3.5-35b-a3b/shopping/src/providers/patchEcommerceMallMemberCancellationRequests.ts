import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCancellationRequestAtSummaryTransformer } from "../transformers/EcommerceMallCancellationRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberCancellationRequests(props: {
  member: MemberPayload;
  body: IEcommerceMallCancellationRequest.IRequest;
}): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
  const limit =
    props.body.limit !== undefined ? Math.min(props.body.limit, 100) : 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const afterDate =
    props.body.after_date !== undefined
      ? new Date(props.body.after_date)
      : undefined;
  const beforeDate =
    props.body.before_date !== undefined
      ? new Date(props.body.before_date)
      : undefined;
  const cursorDate =
    props.body.cursor !== null && props.body.cursor !== undefined
      ? new Date(props.body.cursor)
      : undefined;
  // Build date filter condition
  const dateFilter: Prisma.DateTimeFilter | undefined =
    afterDate !== undefined ||
    beforeDate !== undefined ||
    cursorDate !== undefined
      ? {
          ...(afterDate !== undefined && { gte: afterDate }),
          ...(beforeDate !== undefined && { lte: beforeDate }),
          ...(cursorDate !== undefined && { lt: cursorDate }),
        }
      : undefined;
  // Build where clause for filtering
  const whereInput: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    item: {
      ecommerce_mall_order_id: props.member.id,
    },
    ...(dateFilter !== undefined && { created_at: dateFilter }),
  };
  // Apply status filter if provided
  if (props.body.status !== undefined) {
    whereInput.status = props.body.status;
  }
  // Apply order_id filter if provided
  if (props.body.order_id !== undefined) {
    whereInput.ecommerce_mall_order_id = props.body.order_id;
  }
  // Build order by clause
  const orderByInput: Prisma.ecommerce_mall_cancellation_requestsOrderByWithRelationInput[] =
    props.body.sort !== undefined
      ? props.body.sort.startsWith("-")
        ? props.body.sort === "-created_at"
          ? [{ created_at: "desc" as const }]
          : props.body.sort === "-status"
            ? [{ status: "desc" as const }]
            : props.body.sort === "-reason"
              ? [{ reason: "desc" as const }]
              : [{ created_at: "desc" as const }]
        : props.body.sort === "status"
          ? [{ status: "asc" as const }]
          : props.body.sort === "reason"
            ? [{ reason: "asc" as const }]
            : [{ created_at: "asc" as const }]
      : [{ created_at: "desc" as const }];
  // Execute findMany query
  const records =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: whereInput,
      skip: skip > 0 ? skip : undefined,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
    });
  // Execute count query
  const total =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereInput,
    });
  // Calculate pagination metadata
  const current = page;
  const pages = Math.ceil(total / limit);
  // Transform records
  const transformedData = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCancellationRequestAtSummaryTransformer.transform,
  );
  // Build response
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data: transformedData,
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
// import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
// import { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberCancellationRequests(props: {
//   member: MemberPayload;
//   body: IEcommerceMallCancellationRequest.IRequest;
// }): Promise<IPageIEcommerceMallCancellationRequest.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
//     ...EcommerceMallCancellationRequestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCancellationRequestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------