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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallUserBanAtSummaryTransformer } from "../transformers/EcommerceMallUserBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorUserBans(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallUserBan.IRequest;
}): Promise<IPageIEcommerceMallUserBan.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = Math.min(props.body.limit ?? 20, 100);
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_user_bansWhereInput = {
    ...(props.body.ban_status === "active"
      ? { deleted_at: { equals: null } }
      : props.body.ban_status === "completed"
        ? { deleted_at: { not: null } }
        : {}),
    ...(props.body.user_type && props.body.user_type !== "all"
      ? { user_type: props.body.user_type }
      : {}),
    ...(props.body.administrator_id
      ? { administrator_id: props.body.administrator_id }
      : {}),
    ...(props.body.banned_at_after
      ? { banned_at: { gte: props.body.banned_at_after } }
      : {}),
    ...(props.body.banned_at_before
      ? { banned_at: { lte: props.body.banned_at_before } }
      : {}),
    ...(props.body.created_at_after
      ? { created_at: { gte: props.body.created_at_after } }
      : {}),
    ...(props.body.created_at_before
      ? { created_at: { lte: props.body.created_at_before } }
      : {}),
    ...(props.body.reason_contains
      ? { reason: { contains: props.body.reason_contains } }
      : {}),
  };
  const orderByInput: Prisma.ecommerce_mall_user_bansOrderByWithRelationInput[] =
    (() => {
      const defaultOrderBy: Prisma.ecommerce_mall_user_bansOrderByWithRelationInput[] =
        [{ created_at: "desc" }];
      if (!props.body.sort) {
        return defaultOrderBy;
      }
      const parts: string[] = props.body.sort.split(":");
      const field: string = parts[0] ?? "created_at";
      const direction: string = parts[1] ?? "desc";
      const validFields: readonly string[] = [
        "created_at",
        "banned_at",
        "administrator_id",
        "reason",
      ];
      const validDirections: readonly string[] = ["asc", "desc"];
      if (validFields.includes(field) && validDirections.includes(direction)) {
        return [
          {
            [field]: direction === "asc" ? "asc" : "desc",
          },
        ];
      }
      return defaultOrderBy;
    })();
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallUserBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_user_bans.count({ where: whereInput }),
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
// export async function patchEcommerceMallAdministratorUserBans(props: {
//   administrator: AdministratorPayload;
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