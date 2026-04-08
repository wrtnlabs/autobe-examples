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

export async function patchEcommerceMallAdminAdminCustomers(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.ecommerce_mall_customersWhereInput = {
    ...(props.body.search !== undefined && {
      email: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.status !== undefined && {
      deleted_at: props.body.status === "deleted" ? { not: null } : null,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: props.body.createdAtTo,
      },
    }),
  };
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByClause: Prisma.ecommerce_mall_customersOrderByWithRelationInput =
    sortBy === "email"
      ? { email: sortOrder as "asc" | "desc" }
      : { created_at: sortOrder as "asc" | "desc" };
  const data = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereClause,
    skip: skip,
    take: limit,
    orderBy: orderByClause,
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereClause,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminCustomers(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallCustomer.IRequest;
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