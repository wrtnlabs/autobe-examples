import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminAuditLogTransformer } from "../transformers/ShoppingMallAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAuditLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminAuditLog> {
  const record =
    await MyGlobal.prisma.shopping_mall_admin_audit_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...ShoppingMallAdminAuditLogTransformer.select(),
    });
  return await ShoppingMallAdminAuditLogTransformer.transform(record);
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
// import { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
// import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminAuditLogsLogId(props: {
//   admin: AdminPayload;
//   logId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdminAuditLog> {
//   const record = await MyGlobal.prisma.shopping_mall_admin_audit_logs.findFirstOrThrow({
//     ...ShoppingMallAdminAuditLogTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdminAuditLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------