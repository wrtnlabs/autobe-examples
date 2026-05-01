import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminAdminsAdminIdDemote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  if (props.admin.id === props.adminId) {
    throw new HttpException(
      "Super administrators cannot demote themselves.",
      400,
    );
  }
  const callerAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
      where: {
        id: props.admin.id,
        deleted_at: null,
      },
      select: { id: true, grade: true },
    });
  if (callerAdmin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can demote administrators.",
      403,
    );
  }
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
      where: {
        id: props.adminId,
        deleted_at: null,
      },
      select: { id: true, grade: true },
    });
  if (targetAdmin.grade !== "super") {
    throw new HttpException(
      "The target administrator is already at the regular grade and cannot be demoted further.",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      grade: "regular",
      updated_at: new Date().toISOString(),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
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
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdminAdminsAdminIdDemote(props: {
//   admin: AdminPayload;
//   adminId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdmin> {
//   const record = await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
//     ...ShoppingMallAdminTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdminTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------