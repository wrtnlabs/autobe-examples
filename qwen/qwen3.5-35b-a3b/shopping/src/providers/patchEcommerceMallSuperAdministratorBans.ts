import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallUserBanAtSummaryTransformer } from "../transformers/EcommerceMallUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorBans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallUserBan.IRequest;
}): Promise<IPageIEcommerceMallUserBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_user_bansWhereInput = {
    ...(props.body.ban_status === "completed" && {
      deleted_at: {
        not: null,
      },
    }),
    ...(props.body.ban_status === "active" && {
      deleted_at: null,
    }),
    ...(props.body.user_type &&
      props.body.user_type !== "all" && {
        user_type: props.body.user_type,
      }),
    ...(props.body.administrator_id !== undefined && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.banned_at_after || props.body.banned_at_before
      ? {
          banned_at: {
            ...(props.body.banned_at_after && {
              gte: props.body.banned_at_after,
            }),
            ...(props.body.banned_at_before && {
              lte: props.body.banned_at_before,
            }),
          },
        }
      : {}),
    ...(props.body.reason_contains !== undefined && {
      reason: {
        contains: props.body.reason_contains,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.ecommerce_mall_user_bansWhereInput;
  const sortField = (props.body.sort ?? "banned_at:desc").split(":")[0] as
    | "created_at"
    | "banned_at"
    | "administrator_id"
    | "reason";
  const sortDirection = (props.body.sort ?? "banned_at:desc").split(":")[1] as
    | "asc"
    | "desc";
  const orderByInput = (
    sortDirection === "asc"
      ? { [sortField]: "asc" as const }
      : { [sortField]: "desc" as const }
  ) satisfies Prisma.ecommerce_mall_user_bansOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_user_bans.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallUserBanAtSummaryTransformer.transform,
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
// import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
// import { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorBans(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallUserBan.IRequest;
// }): Promise<IPageIEcommerceMallUserBan.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
//     ...EcommerceMallUserBanAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallUserBanAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------