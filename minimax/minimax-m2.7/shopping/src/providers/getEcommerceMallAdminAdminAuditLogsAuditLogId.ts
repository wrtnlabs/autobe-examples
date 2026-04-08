import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAuditLogTransformer } from "../transformers/EcommerceMallAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminAuditLogsAuditLogId(props: {
  admin: AdminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminAuditLog> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findFirstOrThrow({
      ...EcommerceMallAdminAuditLogTransformer.select(),
      where: { id: props.auditLogId },
    });
  return await EcommerceMallAdminAuditLogTransformer.transform(record);
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
// import { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallAdminAdminAuditLogsAuditLogId(props: {
//   admin: AdminPayload;
//   auditLogId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdminAuditLog> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.findFirstOrThrow({
//     ...EcommerceMallAdminAuditLogTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminAuditLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------