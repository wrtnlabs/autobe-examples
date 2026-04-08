import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with customer filter (required) and optional filters
  const whereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    ...(props.body.createdAfter && {
      created_at: { gte: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lte: new Date(props.body.createdBefore) },
    }),
    ...(props.body.showExpired === false && {
      expired_at: { gt: new Date() },
    }),
    ...(props.body.ipPattern && {
      ip: { contains: props.body.ipPattern },
    }),
  } satisfies Prisma.ecommerce_mall_customer_sessionsWhereInput;
  // Build order by clause
  const orderByInput = (
    props.body.sortBy === "expiredAt"
      ? { expired_at: props.body.sortOrder ?? ("desc" as const) }
      : { created_at: props.body.sortOrder ?? ("desc" as const) }
  ) satisfies Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput;
  // Query sessions with transformer select
  const records =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
    });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where: whereInput,
  });
  // Transform records using transformer
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
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
// import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
// import { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomerSessions(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomerSession.IRequest;
// }): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
//     ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCustomerSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------