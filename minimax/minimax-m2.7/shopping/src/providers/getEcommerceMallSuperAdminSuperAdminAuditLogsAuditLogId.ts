import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAuditLogTransformer } from "../transformers/EcommerceMallSuperAdminAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminSuperAdminAuditLogsAuditLogId(props: {
  superAdmin: SuperadminPayload;
  auditLogId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSuperAdminAuditLog> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findUniqueOrThrow(
      {
        where: {
          id: props.auditLogId,
        },
        ...EcommerceMallSuperAdminAuditLogTransformer.select(),
      },
    );
  return await EcommerceMallSuperAdminAuditLogTransformer.transform(record);
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
// import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminSuperAdminAuditLogsAuditLogId(props: {
//   superAdmin: SuperadminPayload;
//   auditLogId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSuperAdminAuditLog> {
//   const record = await MyGlobal.prisma.ecommerce_mall_super_admin_audit_logs.findFirstOrThrow({
//     ...EcommerceMallSuperAdminAuditLogTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSuperAdminAuditLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------