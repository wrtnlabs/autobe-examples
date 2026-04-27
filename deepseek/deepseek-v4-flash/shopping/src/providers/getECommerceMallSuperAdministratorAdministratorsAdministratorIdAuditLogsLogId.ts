import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ECommerceMallAdministratorAuditLogTransformer } from "../transformers/ECommerceMallAdministratorAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSuperAdministratorAdministratorsAdministratorIdAuditLogsLogId(props: {
  superAdministrator: SuperadministratorPayload;
  administratorId: string & tags.Format<"uuid">;
  logId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallAdministratorAuditLog> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.findFirstOrThrow(
      {
        ...ECommerceMallAdministratorAuditLogTransformer.select(),
        where: {
          id: props.logId,
          e_commerce_mall_administrator_id: props.administratorId,
          deleted_at: null,
        },
      },
    );
  return await ECommerceMallAdministratorAuditLogTransformer.transform(record);
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
// import { IECommerceMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministratorAuditLog";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSuperAdministratorAdministratorsAdministratorIdAuditLogsLogId(props: {
//   superAdministrator: SuperadministratorPayload;
//   administratorId: string & tags.Format<"uuid">;
//   logId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallAdministratorAuditLog> {
//   const record = await MyGlobal.prisma.e_commerce_mall_administrator_audit_logs.findFirstOrThrow({
//     ...ECommerceMallAdministratorAuditLogTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallAdministratorAuditLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------