import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallUserBanOfSellerTransformer } from "../transformers/EcommerceMallUserBanOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorUserBanOfSellers(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallUserBanOfSeller.IRequest;
}): Promise<IPageIEcommerceMallUserBanOfSeller> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_user_ban_of_sellersWhereInput = {
    deleted_at: props.body.include_unbanned ? undefined : null,
    ...(props.body.seller_id !== undefined && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.reason !== undefined && {
      ban: {
        reason: {
          contains: props.body.reason,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.banned_after !== undefined && {
      ban: {
        banned_at: {
          gte: props.body.banned_after,
        },
      },
    }),
    ...(props.body.banned_before !== undefined && {
      ban: {
        banned_at: {
          lte: props.body.banned_before,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_user_ban_of_sellersWhereInput;
  const orderByInput: Prisma.ecommerce_mall_user_ban_of_sellersOrderByWithRelationInput =
    (props.body.sort_by === "banned_at" || props.body.sort_by === undefined) &&
    (props.body.sort_direction === "asc" ||
      props.body.sort_direction === "desc")
      ? { ban: { banned_at: props.body.sort_direction } }
      : props.body.sort_by === "created_at" &&
          props.body.sort_direction !== undefined
        ? { created_at: props.body.sort_direction }
        : props.body.sort_by === "updated_at" &&
            props.body.sort_direction !== undefined
          ? { updated_at: props.body.sort_direction }
          : { ban: { banned_at: "desc" } };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallUserBanOfSellerTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallUserBanOfSellerTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallUserBanOfSeller;
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
// import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
// import { IPageIEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorUserBanOfSellers(props: {
//   administrator: AdministratorPayload;
//   body: IEcommerceMallUserBanOfSeller.IRequest;
// }): Promise<IPageIEcommerceMallUserBanOfSeller> {
//   const records = await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.findMany({
//     ...EcommerceMallUserBanOfSellerTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallUserBanOfSellerTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------