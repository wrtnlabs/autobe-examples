import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
import { IShoppingMallAdministratorAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLogDetail";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorAuditLogTransformer } from "../transformers/ShoppingMallAdministratorAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAuditLogsLogId(props: {
  administrator: AdministratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorAuditLog> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrator_audit_logs.findUniqueOrThrow(
      {
        ...ShoppingMallAdministratorAuditLogTransformer.select(),
        where: { id: props.logId },
      },
    );
  return await ShoppingMallAdministratorAuditLogTransformer.transform(record);
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
// import { IShoppingMallAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLog";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// import { IShoppingMallAdministratorAuditLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorAuditLogDetail";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdministratorAuditLogsLogId(props: {
//   administrator: AdministratorPayload;
//   logId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallAdministratorAuditLog> {
//   const record = await MyGlobal.prisma.shopping_mall_administrator_audit_logs.findFirstOrThrow({
//     ...ShoppingMallAdministratorAuditLogTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallAdministratorAuditLogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------