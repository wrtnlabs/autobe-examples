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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallUserBanOfSellerTransformer } from "../transformers/EcommerceMallUserBanOfSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorUserBanOfSellers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallUserBanOfSeller.IRequest;
}): Promise<IPageIEcommerceMallUserBanOfSeller> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("page must be >= 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const whereClause: Prisma.ecommerce_mall_user_ban_of_sellersWhereInput = {
    ...(props.body.seller_id && {
      seller_id: props.body.seller_id,
    }),
    ...(props.body.banned_after && {
      ban: {
        banned_at: {
          gte: props.body.banned_after,
        },
      },
    }),
    ...(props.body.banned_before && {
      ban: {
        banned_at: {
          lte: props.body.banned_before,
        },
      },
    }),
    ...(props.body.reason && {
      ban: {
        reason: {
          contains: props.body.reason,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.include_unbanned === true ? {} : { deleted_at: null }),
  };
  const orderByInput = (
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_direction ?? "desc" }
      : props.body.sort_by === "updated_at"
        ? { updated_at: props.body.sort_direction ?? "desc" }
        : { ban: { banned_at: props.body.sort_direction ?? "desc" } }
  ) satisfies Prisma.ecommerce_mall_user_ban_of_sellersOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.findMany({
      where: whereClause,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallUserBanOfSellerTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_user_ban_of_sellers.count({
    where: whereClause,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallUserBanOfSellerTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
// import { IPageIEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorUserBanOfSellers(props: {
//   superAdministrator: SuperadministratorPayload;
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