import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCustomerAtSummaryTransformer } from "../transformers/ECommerceMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IECommerceMallCustomer.IRequest;
}): Promise<IPageIECommerceMallCustomer.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  // Build where clause from request filters
  const where: Prisma.e_commerce_mall_customersWhereInput = {};
  // Handle email search (ILIKE/partial match) and exact email match
  const emailFilters: Prisma.StringFilter[] = [];
  if (props.body.search !== undefined) {
    emailFilters.push({ contains: props.body.search, mode: "insensitive" });
  }
  if (props.body.email !== undefined) {
    emailFilters.push({ equals: props.body.email });
  }
  if (emailFilters.length === 1) {
    where.email = emailFilters[0];
  } else if (emailFilters.length > 1) {
    where.AND = emailFilters.map((f: Prisma.StringFilter) => ({ email: f }));
  }
  // Handle created_at date range filter
  // Prisma DateTimeFilter accepts string | Date — pass ISO strings directly
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = props.body.created_at_from;
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = props.body.created_at_to;
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.created_at = createdAtFilter;
  }
  // Handle ban status filter
  if (props.body.banned === true) {
    where.banned_at = { not: null };
  } else if (props.body.banned === false) {
    where.banned_at = null;
  }
  // Handle deletion status filter
  if (props.body.deleted === true) {
    where.deleted_at = { not: null };
  } else if (props.body.deleted === false) {
    where.deleted_at = null;
  }
  // Build orderBy from sort field and direction
  const sortField: "created_at" | "email" | "banned_at" =
    props.body.sort ?? "created_at";
  const sortDirection: "asc" | "desc" = props.body.direction ?? "desc";
  const orderBy: Prisma.e_commerce_mall_customersOrderByWithRelationInput = {
    [sortField]: sortDirection,
  };
  // Execute queries sequentially (count first, then findMany)
  const total: number = await MyGlobal.prisma.e_commerce_mall_customers.count({
    where,
  });
  const records =
    total === 0
      ? []
      : await MyGlobal.prisma.e_commerce_mall_customers.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          ...ECommerceMallCustomerAtSummaryTransformer.select(),
        });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallCustomerAtSummaryTransformer.transform,
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
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IPageIECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorCustomers(props: {
//   administrator: AdministratorPayload;
//   body: IECommerceMallCustomer.IRequest;
// }): Promise<IPageIECommerceMallCustomer.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_customers.findMany({
//     ...ECommerceMallCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------