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

export async function patchEcommerceMallSuperAdministratorUserBans(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallUserBan.IRequest;
}): Promise<IPageIEcommerceMallUserBan.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  // Validate pagination parameters
  if (page < 1) {
    throw new HttpException("Invalid page number", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Invalid limit", 400);
  }
  const skip: number = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.ecommerce_mall_user_bansWhereInput = {};
  // Filter by user_type
  if (props.body.user_type && props.body.user_type !== "all") {
    whereInput.user_type = props.body.user_type;
  }
  // Filter by ban_status
  if (props.body.ban_status && props.body.ban_status !== "all") {
    if (props.body.ban_status === "active") {
      whereInput.deleted_at = null;
    } else {
      whereInput.deleted_at = { not: null };
    }
  }
  // Filter by administrator_id
  if (props.body.administrator_id) {
    whereInput.administrator_id = props.body.administrator_id;
  }
  // Filter by date range: created_at
  const createdAtConditions: {
    gte?: (string & tags.Format<"date-time">) | undefined;
    lte?: (string & tags.Format<"date-time">) | undefined;
  } = {};
  if (props.body.created_at_after) {
    createdAtConditions.gte = props.body.created_at_after;
  }
  if (props.body.created_at_before) {
    createdAtConditions.lte = props.body.created_at_before;
  }
  if (Object.keys(createdAtConditions).length > 0) {
    whereInput.created_at = createdAtConditions;
  }
  // Filter by date range: banned_at
  const bannedAtConditions: {
    gte?: (string & tags.Format<"date-time">) | undefined;
    lte?: (string & tags.Format<"date-time">) | undefined;
  } = {};
  if (props.body.banned_at_after) {
    bannedAtConditions.gte = props.body.banned_at_after;
  }
  if (props.body.banned_at_before) {
    bannedAtConditions.lte = props.body.banned_at_before;
  }
  if (Object.keys(bannedAtConditions).length > 0) {
    whereInput.banned_at = bannedAtConditions;
  }
  // Filter by reason_contains
  if (props.body.reason_contains) {
    whereInput.reason = {
      contains: props.body.reason_contains,
      mode: "insensitive",
    };
  }
  // Build ORDER BY clause
  let orderByInput: Prisma.ecommerce_mall_user_bansOrderByWithRelationInput[] =
    [{ created_at: "desc" }];
  if (props.body.sort) {
    const sortParts: string[] = props.body.sort.split(":");
    if (sortParts.length === 2) {
      const field: string = sortParts[0];
      const direction: "asc" | "desc" = sortParts[1] as "asc" | "desc";
      // Validate sort field
      const allowedSortFields: Set<string> = new Set([
        "created_at",
        "banned_at",
        "administrator_id",
        "reason",
      ]);
      if (allowedSortFields.has(field)) {
        orderByInput = [{ [field]: direction }];
      }
    }
  }
  // Execute findMany
  const records = await MyGlobal.prisma.ecommerce_mall_user_bans.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceMallUserBanAtSummaryTransformer.select(),
  });
  // Execute count
  const total: number = await MyGlobal.prisma.ecommerce_mall_user_bans.count({
    where: whereInput,
  });
  // Build response
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
  } satisfies IPageIEcommerceMallUserBan.ISummary;
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
// export async function patchEcommerceMallSuperAdministratorUserBans(props: {
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