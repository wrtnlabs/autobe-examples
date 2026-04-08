import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminSessionTransformer } from "../transformers/EcommerceMallSuperAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSuperAdminSession> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        ecommerce_mall_super_admin_id: props.superAdmin.id,
        expired_at: { gt: new Date() },
      },
      ...EcommerceMallSuperAdminSessionTransformer.select(),
    });
  return await EcommerceMallSuperAdminSessionTransformer.transform(record);
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
// import { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminSessionsSessionId(props: {
//   superAdmin: SuperadminPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSuperAdminSession> {
//   const record = await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirstOrThrow({
//     ...EcommerceMallSuperAdminSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSuperAdminSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------