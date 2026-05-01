import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPasswordReset";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminPasswordResetAtSummaryTransformer } from "../transformers/ShoppingMallAdminPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdminAdminsAdminIdPasswordResets(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPasswordReset.IRequest;
}): Promise<IPageIShoppingMallAdminPasswordReset.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput = {
    shopping_mall_admin_id: props.adminId,
    ...(props.body.created_from !== undefined ||
    props.body.created_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_from !== undefined
              ? { gte: props.body.created_from }
              : {}),
            ...(props.body.created_to !== undefined
              ? { lte: props.body.created_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.expired_from !== undefined ||
    props.body.expired_to !== undefined ||
    props.body.status !== undefined
      ? {
          expired_at: {
            ...(props.body.expired_from !== undefined
              ? { gte: props.body.expired_from }
              : {}),
            ...(props.body.expired_to !== undefined
              ? { lte: props.body.expired_to }
              : {}),
            ...(props.body.status === "active"
              ? { gt: new Date().toISOString() }
              : props.body.status === "expired"
                ? { lte: new Date().toISOString() }
                : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_admin_password_resetsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ShoppingMallAdminPasswordResetAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallAdminPasswordResetAtSummaryTransformer.transform,
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
// import { IShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordReset";
// import { IPageIShoppingMallAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallAdminAdminsAdminIdPasswordResets(props: {
//   admin: AdminPayload;
//   adminId: string & tags.Format<"uuid">;
//   body: IShoppingMallAdminPasswordReset.IRequest;
// }): Promise<IPageIShoppingMallAdminPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_admin_password_resets.findMany({
//     ...ShoppingMallAdminPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallAdminPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------