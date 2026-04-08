import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCustomerAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminCustomers(props: {
  admin: AdminPayload;
  query?: {
    status?: "active" | "banned";
    minCreatedAt?: string;
    maxCreatedAt?: string;
    page?: number;
    limit?: number;
    sortBy?: "createdAt" | "email";
    sortOrder?: "asc" | "desc";
  };
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const query = props.query ?? {};
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sortField = query.sortBy === "email" ? "email" : "created_at";
  const sortDirection =
    query.sortOrder === "asc" ? ("asc" as const) : ("desc" as const);
  const whereStatus = (() => {
    if (query.status === "banned") return { deleted_at: { not: null } };
    if (query.status === "active") return { deleted_at: null };
    return {};
  })();
  const whereCreatedAt = (() => {
    const conditions: Record<string, unknown> = {};
    if (query.minCreatedAt) conditions["gte"] = new Date(query.minCreatedAt);
    if (query.maxCreatedAt) conditions["lte"] = new Date(query.maxCreatedAt);
    return Object.keys(conditions).length > 0 ? conditions : undefined;
  })();
  const whereInput: Prisma.ecommerce_mall_customersWhereInput = {
    ...whereStatus,
    ...(whereCreatedAt ? { created_at: whereCreatedAt } : {}),
  };
  const orderByInput: Prisma.ecommerce_mall_customersOrderByWithRelationInput =
    {
      [sortField]: sortDirection,
    };
  const records = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallCustomerAtSummaryTransformer.transform,
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
// import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminCustomers(props: {
//   admin: AdminPayload;
// }): Promise<IPageIEcommerceMallCustomer.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
//     ...EcommerceMallCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------