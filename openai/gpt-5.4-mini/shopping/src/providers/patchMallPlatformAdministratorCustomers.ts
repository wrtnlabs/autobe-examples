import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCustomerAtSummaryTransformer } from "../transformers/MallPlatformCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCustomer.IRequest;
}): Promise<IPageIMallPlatformCustomer.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_customersWhereInput = {
    ...(props.body.search !== undefined
      ? { email: { contains: props.body.search, mode: "insensitive" } }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
  };
  const orderBy: Prisma.mall_platform_customersOrderByWithRelationInput[] =
    props.body.sort === "email"
      ? [{ email: props.body.order === "desc" ? "desc" : "asc" }, { id: "asc" }]
      : props.body.sort === "status"
        ? [
            { status: props.body.order === "desc" ? "desc" : "asc" },
            { id: "asc" },
          ]
        : [
            { created_at: props.body.order === "asc" ? "asc" : "desc" },
            { id: "asc" },
          ];
  const records = await MyGlobal.prisma.mall_platform_customers.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...MallPlatformCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_customers.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformCustomerAtSummaryTransformer.transform,
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
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorCustomers(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformCustomer.IRequest;
// }): Promise<IPageIMallPlatformCustomer.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_customers.findMany({
//     ...MallPlatformCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------