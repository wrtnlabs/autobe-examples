import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminAuditLogMetadatumTransformer } from "../transformers/EcommerceMallSuperAdminAuditLogMetadatumTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminSuperAdminAuditLogsLogIdMetadataMetadataId(props: {
  superAdmin: SuperadminPayload;
  logId: string & tags.Format<"uuid">;
  metadataId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSuperAdminAuditLogMetadatum> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.findFirstOrThrow(
      {
        ...EcommerceMallSuperAdminAuditLogMetadatumTransformer.select(),
        where: {
          id: props.metadataId,
          ecommerce_mall_super_admin_audit_log_id: props.logId,
        },
      },
    );
  return await EcommerceMallSuperAdminAuditLogMetadatumTransformer.transform(
    record,
  );
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
// import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
// import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminSuperAdminAuditLogsLogIdMetadataMetadataId(props: {
//   superAdmin: SuperadminPayload;
//   logId: string & tags.Format<"uuid">;
//   metadataId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSuperAdminAuditLogMetadatum> {
//   const record = await MyGlobal.prisma.ecommerce_mall_super_admin_audit_log_metadata.findFirstOrThrow({
//     ...EcommerceMallSuperAdminAuditLogMetadatumTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSuperAdminAuditLogMetadatumTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------