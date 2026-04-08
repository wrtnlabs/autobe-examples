import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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

export async function patchEcommerceMallAdminCustomers(props: {
  admin: AdminPayload;
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search && {
      email: { contains: props.body.search },
    }),
    ...(props.body.status === "active" && {
      deleted_at: null,
    }),
    ...(props.body.status === "inactive" && {
      deleted_at: { not: null },
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
    ...(props.body.displayName && {
      profile: {
        display_name: { contains: props.body.displayName },
      },
    }),
  } satisfies Prisma.ecommerce_mall_customersWhereInput;
  const orderByInput = (
    props.body.sort === "email"
      ? { email: props.body.order ?? ("desc" as const) }
      : { created_at: props.body.order ?? ("desc" as const) }
  ) satisfies Prisma.ecommerce_mall_customersOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    ...EcommerceMallCustomerAtSummaryTransformer.select(),
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  return {
    pagination: {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(total / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      },
      data: [],
    },
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminCustomers(props: {
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