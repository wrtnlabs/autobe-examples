import { IEcommercePlatformActiveSessionRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformActiveSessionRevocation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformCustomerSessionsActiveRevokeAll(props: {
  customer: CustomerPayload;
}): Promise<IEcommercePlatformActiveSessionRevocation.IConfirm> {
  const result =
    await MyGlobal.prisma.ecommerce_platform_customer_sessions.updateMany({
      data: {
        deleted_at: new Date(),
      },
      where: {
        deleted_at: null,
        ecommerce_platform_customer_id: props.customer.id,
      },
    });
  return {
    revokedCount: result.count,
  };
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
// import { IEcommercePlatformActiveSessionRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformActiveSessionRevocation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformCustomerSessionsActiveRevokeAll(props: {
//   customer: CustomerPayload;
// }): Promise<IEcommercePlatformActiveSessionRevocation.IConfirm> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------