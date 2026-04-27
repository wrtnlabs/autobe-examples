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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallCustomerAtSummaryTransformer } from "../transformers/ECommerceMallCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallSuperAdministratorCustomers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IECommerceMallCustomer.IRequest;
}): Promise<IPageIECommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const direction = props.body.direction ?? "desc";
  const containsFilter = (
    value: string,
  ): {
    contains: string;
    mode: "insensitive";
  } => ({
    contains: value,
    mode: "insensitive",
  });
  const whereInput = {
    ...(props.body.search !== undefined
      ? { email: containsFilter(props.body.search) }
      : {}),
    ...(props.body.email !== undefined ? { email: props.body.email } : {}),
    ...(props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            gte: props.body.created_at_from,
            lte: props.body.created_at_to,
          },
        }
      : props.body.created_at_from !== undefined
        ? { created_at: { gte: props.body.created_at_from } }
        : props.body.created_at_to !== undefined
          ? { created_at: { lte: props.body.created_at_to } }
          : {}),
    ...(props.body.banned === true
      ? { banned_at: { not: null } }
      : props.body.banned === false
        ? { banned_at: null }
        : {}),
    ...(props.body.deleted === true
      ? { deleted_at: { not: null } }
      : props.body.deleted === false
        ? { deleted_at: null }
        : {}),
  } satisfies Prisma.e_commerce_mall_customersWhereInput;
  const orderByInput = {
    [sort]: direction,
  } satisfies Prisma.e_commerce_mall_customersOrderByWithRelationInput;
  const data = await MyGlobal.prisma.e_commerce_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ECommerceMallCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.e_commerce_mall_customers.count({
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
      data,
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
// export async function patchECommerceMallSuperAdministratorCustomers(props: {
//   superAdministrator: SuperadministratorPayload;
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