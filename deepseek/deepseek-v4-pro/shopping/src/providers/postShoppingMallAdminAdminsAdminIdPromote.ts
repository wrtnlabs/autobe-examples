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

export async function postShoppingMallAdminAdminsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const actor = await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: {
      id: true,
      grade: true,
    },
  });
  if (actor.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  const target = await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: {
      id: true,
      grade: true,
    },
  });
  if (target.grade !== "regular") {
    throw new HttpException("Conflict", 409);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      grade: "super",
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      admin: { connect: { id: props.admin.id } },
      action_type: "promote_admin",
      target_entity_type: "admin",
      target_entity_id: props.adminId,
      old_value: "regular",
      new_value: "super",
      reason: null,
      created_at: now,
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
// export async function postShoppingMallAdminAdminsAdminIdPromote(props: {
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