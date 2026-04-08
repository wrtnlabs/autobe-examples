import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminPasswordResetTransformer } from "../transformers/EcommerceMallAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminPasswordResets(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminPasswordReset.IRequest;
}): Promise<IPageIEcommerceMallAdminPasswordReset> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereCondition: Prisma.ecommerce_mall_admin_password_resetsWhereInput =
    {};
  if (props.body.ecommerce_mall_admin_id) {
    whereCondition.ecommerce_mall_admin_id = props.body.ecommerce_mall_admin_id;
  }
  if (props.body.status && props.body.status !== "all") {
    const now = new Date();
    if (props.body.status === "active") {
      whereCondition.used_at = null;
      whereCondition.expires_at = { gt: now };
    } else if (props.body.status === "used") {
      whereCondition.used_at = { not: null };
    } else if (props.body.status === "expired") {
      whereCondition.used_at = null;
      whereCondition.expires_at = { lte: now };
    }
  }
  if (props.body.created_at_from) {
    whereCondition.created_at = {
      ...(whereCondition.created_at as object),
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to) {
    whereCondition.created_at = {
      ...(whereCondition.created_at as object),
      lte: new Date(props.body.created_at_to),
    };
  }
  if (props.body.expires_at_from) {
    whereCondition.expires_at = {
      ...((whereCondition.expires_at as object) ?? {}),
      gte: new Date(props.body.expires_at_from),
    };
  }
  if (props.body.expires_at_to) {
    whereCondition.expires_at = {
      ...((whereCondition.expires_at as object) ?? {}),
      lte: new Date(props.body.expires_at_to),
    };
  }
  const records =
    await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findMany({
      ...EcommerceMallAdminPasswordResetTransformer.select(),
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_password_resets.count({
      where: whereCondition,
    });
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
      EcommerceMallAdminPasswordResetTransformer.transform,
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
// import { IEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPasswordReset";
// import { IPageIEcommerceMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPasswordReset";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminAdminPasswordResets(props: {
//   admin: AdminPayload;
//   body: IEcommerceMallAdminPasswordReset.IRequest;
// }): Promise<IPageIEcommerceMallAdminPasswordReset> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admin_password_resets.findMany({
//     ...EcommerceMallAdminPasswordResetTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminPasswordResetTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------