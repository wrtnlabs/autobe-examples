import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallAdminAdminAccount(props: {
  admin: AdminPayload;
}): Promise<void> {
  // 1. Verify the admin exists in database (throws 404 if not found)
  await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
  });
  // 2. Soft delete the admin account by setting deleted_at timestamp
  // Note: Prisma DateTime columns require Date objects for data input
  await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.admin.id },
    data: {
      deleted_at: new Date(),
    },
  });
  // 3. Delete all active sessions for this admin
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.deleteMany({
    where: {
      ecommerce_mall_admin_id: props.admin.id,
    },
  });
  // 4. Return void for 204 No Content response
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallAdminAdminAccount(props: {
//   admin: AdminPayload;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------