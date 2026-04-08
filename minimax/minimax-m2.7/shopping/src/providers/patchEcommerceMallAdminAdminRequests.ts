import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestOfCustomerAtSummaryTransformer } from "../transformers/EcommerceMallAdminRequestOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminRequestOfCustomer.IRequest;
}): Promise<IPageIEcommerceMallAdminRequestOfCustomer.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
      ...EcommerceMallAdminRequestOfCustomerAtSummaryTransformer.select(),
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.ecommerce_mall_admin_requests.count({}),
  ]);
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: [],
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallAdminRequestOfCustomerAtSummaryTransformer.transform,
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
// import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
// import { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminRequests(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdminRequestOfCustomer.IRequest;
// }): Promise<IPageIEcommerceMallAdminRequestOfCustomer.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_requests.findMany({
//     ...EcommerceMallAdminRequestOfCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminRequestOfCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------