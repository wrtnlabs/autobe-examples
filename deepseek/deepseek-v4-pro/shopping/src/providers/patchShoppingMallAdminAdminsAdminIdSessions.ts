import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminSessionAtSummaryTransformer } from "../transformers/ShoppingMallAdminSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminsAdminIdSessions(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminSession.IRequest;
}): Promise<IPageIShoppingMallAdminSession.ISummary> {
  const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (targetAdmin === null) {
    throw new HttpException("Administrator not found", 404);
  }
  if (props.admin.id !== props.adminId) {
    const authAdmin =
      await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
        where: { id: props.admin.id },
        select: { grade: true },
      });
    if (authAdmin.grade !== "super") {
      throw new HttpException("Forbidden", 403);
    }
  }
  const hasExpiredDateRangeFilter =
    props.body.expired_from !== undefined ||
    props.body.expired_to !== undefined;
  const now = new Date().toISOString();
  const whereInput = {
    shopping_mall_admin_id: props.adminId,
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.created_from !== undefined ||
    props.body.created_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_from !== undefined && {
              gte: props.body.created_from,
            }),
            ...(props.body.created_to !== undefined && {
              lte: props.body.created_to,
            }),
          },
        }
      : {}),
    ...(props.body.expired_from !== undefined ||
    props.body.expired_to !== undefined
      ? {
          expired_at: {
            ...(props.body.expired_from !== undefined && {
              gte: props.body.expired_from,
            }),
            ...(props.body.expired_to !== undefined && {
              lte: props.body.expired_to,
            }),
          },
        }
      : {}),
    ...(!hasExpiredDateRangeFilter && props.body.expiration_status === "active"
      ? { expired_at: { gt: now } }
      : {}),
    ...(!hasExpiredDateRangeFilter && props.body.expiration_status === "expired"
      ? { expired_at: { lte: now } }
      : {}),
  } satisfies Prisma.shopping_mall_admin_sessionsWhereInput;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallAdminSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_admin_sessions.count({
    where: whereInput,
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
      ShoppingMallAdminSessionAtSummaryTransformer.transform,
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
// import { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
// import { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminAdminsAdminIdSessions(props: {
//   admin: AdminPayload;
//   adminId: string & tags.Format<"uuid">;
//   body: IShoppingMallAdminSession.IRequest;
// }): Promise<IPageIShoppingMallAdminSession.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_admin_sessions.findMany({
//     ...ShoppingMallAdminSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdminSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------