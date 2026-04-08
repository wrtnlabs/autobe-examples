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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallUserBanOfCustomerAtSummaryTransformer } from "../transformers/EcommerceMallUserBanOfCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorUserBanOfCustomers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallUserBanOfCustomer.IRequest;
}): Promise<IPageIEcommerceMallUserBanOfCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_user_ban_of_customersWhereInput = {
    customer: {
      deleted_at: null,
    },
  };
  if (props.body.ban_status === "active") {
    whereInput.deleted_at = null;
  }
  const banWhere: Prisma.ecommerce_mall_user_bansWhereInput | undefined = {};
  let dateFilter: Prisma.DateTimeFilter<"ecommerce_mall_user_bans"> | undefined;
  if (props.body.banned_at_start !== undefined) {
    dateFilter = { gte: new Date(props.body.banned_at_start) };
  }
  if (props.body.banned_at_end !== undefined) {
    if (dateFilter !== undefined) {
      dateFilter = {
        ...dateFilter,
        lte: new Date(props.body.banned_at_end),
      };
    } else {
      dateFilter = {
        lte: new Date(props.body.banned_at_end),
      };
    }
  }
  if (dateFilter !== undefined) {
    banWhere.banned_at = dateFilter;
  }
  if (props.body.administrator_id !== undefined) {
    banWhere.administrator_id = props.body.administrator_id;
  }
  if (props.body.reason !== undefined) {
    banWhere.reason = {
      contains: props.body.reason,
      mode: "insensitive",
    };
  }
  if (Object.keys(banWhere).length > 0) {
    whereInput.ban = banWhere as Prisma.ecommerce_mall_user_bansWhereInput;
  }
  if (props.body.customer_email !== undefined) {
    whereInput.customer!.email = {
      contains: props.body.customer_email,
      mode: "insensitive",
    };
  }
  if (props.body.customer_display_name !== undefined) {
    whereInput.customer!.display_name = {
      contains: props.body.customer_display_name,
      mode: "insensitive",
    };
  }
  const data =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        ban: {
          banned_at: "desc",
        },
      },
      ...EcommerceMallUserBanOfCustomerAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_customers.count({
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
      EcommerceMallUserBanOfCustomerAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallUserBanOfCustomer.ISummary;
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
// export async function patchEcommerceMallSuperAdministratorUserBanOfCustomers(props: {
//   superAdministrator: SuperadministratorPayload;
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