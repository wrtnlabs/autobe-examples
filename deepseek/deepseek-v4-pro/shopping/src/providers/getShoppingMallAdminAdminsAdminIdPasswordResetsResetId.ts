import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { ShoppingMallAdminPasswordResetTransformer } from "../transformers/ShoppingMallAdminPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminsAdminIdPasswordResetsResetId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  resetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPasswordReset> {
  await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  const record =
    await MyGlobal.prisma.shopping_mall_admin_password_resets.findFirstOrThrow({
      where: {
        id: props.resetId,
        shopping_mall_admin_id: props.adminId,
      },
      ...ShoppingMallAdminPasswordResetTransformer.select(),
    });
  return await ShoppingMallAdminPasswordResetTransformer.transform(record);
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
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminAdminsAdminIdPasswordResetsResetId(props: {
//   admin: AdminPayload;
//   adminId: string & tags.Format<"uuid">;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdminPasswordReset> {
//   const record = await MyGlobal.prisma.shopping_mall_admin_password_resets.findFirstOrThrow({
//     ...ShoppingMallAdminPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdminPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------