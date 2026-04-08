import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallUserBanOfCustomerAtSummaryTransformer } from "../transformers/EcommerceMallUserBanOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorUserBanOfCustomers(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallUserBanOfCustomer.IRequest;
}): Promise<IPageIEcommerceMallUserBanOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.ecommerce_mall_user_ban_of_customersWhereInput = {
    deleted_at: props.body.ban_status === "active" ? null : undefined,
    ban: {
      ...(props.body.banned_at_start && {
        banned_at: { gte: props.body.banned_at_start },
      }),
      ...(props.body.banned_at_end && {
        banned_at: { lte: props.body.banned_at_end },
      }),
      ...(props.body.administrator_id && {
        administrator_id: props.body.administrator_id,
      }),
      ...(props.body.reason && {
        reason: { contains: props.body.reason, mode: "insensitive" as const },
      }),
    },
    customer: {
      ...(props.body.customer_email && {
        email: {
          contains: props.body.customer_email,
          mode: "insensitive" as const,
        },
      }),
      ...(props.body.customer_display_name && {
        display_name: {
          contains: props.body.customer_display_name,
          mode: "insensitive" as const,
        },
      }),
    },
  } satisfies Prisma.ecommerce_mall_user_ban_of_customersWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.findMany({
      where: whereClause,
      ...EcommerceMallUserBanOfCustomerAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { ban: { banned_at: "desc" } },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.count({
      where: whereClause,
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
      EcommerceMallUserBanOfCustomerAtSummaryTransformer.transform,
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
// import { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
// import { IPageIEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorUserBanOfCustomers(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallUserBanOfCustomer.IRequest;
// }): Promise<IPageIEcommerceMallUserBanOfCustomer.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.findMany({
//     ...EcommerceMallUserBanOfCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallUserBanOfCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------