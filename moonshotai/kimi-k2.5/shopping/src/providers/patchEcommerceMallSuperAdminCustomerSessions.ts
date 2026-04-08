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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceMallCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminCustomerSessions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallCustomerSession.IRequest;
}): Promise<IPageIEcommerceMallCustomerSession.ISummary> {
  // Build filter conditions
  const where: Prisma.ecommerce_mall_customer_sessionsWhereInput = {};
  // Created at range filter
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    where.created_at = {
      ...((where.created_at as Prisma.DateTimeFilter<"ecommerce_mall_customer_sessions">) ??
        {}),
      gte: new Date(props.body.createdAtFrom),
    };
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    where.created_at = {
      ...((where.created_at as Prisma.DateTimeFilter<"ecommerce_mall_customer_sessions">) ??
        {}),
      lte: new Date(props.body.createdAtTo),
    };
  }
  // Expired at range filter combined with status
  const now = new Date();
  const expiredAtFilter: Prisma.DateTimeNullableFilter<"ecommerce_mall_customer_sessions"> =
    {};
  if (
    props.body.expiredAtFrom !== undefined &&
    props.body.expiredAtFrom !== null
  ) {
    expiredAtFilter.gte = new Date(props.body.expiredAtFrom);
  }
  if (props.body.expiredAtTo !== undefined && props.body.expiredAtTo !== null) {
    expiredAtFilter.lte = new Date(props.body.expiredAtTo);
  }
  if (props.body.status === "active") {
    expiredAtFilter.gt = now;
  } else if (props.body.status === "expired") {
    expiredAtFilter.lte = now;
  }
  if (Object.keys(expiredAtFilter).length > 0) {
    where.expired_at = expiredAtFilter;
  }
  // IP partial match filter
  if (
    props.body.ip !== undefined &&
    props.body.ip !== null &&
    props.body.ip.length > 0
  ) {
    where.ip = { contains: props.body.ip };
  }
  // Pagination settings
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Cursor-based filter (applied on top of existing filters)
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    const cursorDate = new Date(props.body.cursor);
    if (sortBy === "expired_at") {
      where.expired_at = {
        ...((where.expired_at as Prisma.DateTimeNullableFilter<"ecommerce_mall_customer_sessions">) ??
          {}),
        [sortOrder === "desc" ? "lt" : "gt"]: cursorDate,
      };
    } else {
      where.created_at = {
        ...((where.created_at as Prisma.DateTimeFilter<"ecommerce_mall_customer_sessions">) ??
          {}),
        [sortOrder === "desc" ? "lt" : "gt"]: cursorDate,
      };
    }
  }
  // Build orderBy
  const orderBy: Prisma.ecommerce_mall_customer_sessionsOrderByWithRelationInput =
    sortBy === "expired_at"
      ? { expired_at: sortOrder }
      : { created_at: sortOrder };
  // Execute queries sequentially
  const records =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallCustomerSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_customer_sessions.count({
    where,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCustomerSessionAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminCustomerSessions(props: {
//   superAdmin: SuperadminPayload;
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