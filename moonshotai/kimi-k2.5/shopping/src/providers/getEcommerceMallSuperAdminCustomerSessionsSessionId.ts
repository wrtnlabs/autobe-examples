import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallCustomerSessionTransformer } from "../transformers/EcommerceMallCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSuperAdminCustomerSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomerSession> {
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirstOrThrow({
      ...EcommerceMallCustomerSessionTransformer.select(),
      where: { id: props.sessionId },
    });
  return await EcommerceMallCustomerSessionTransformer.transform(session);
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
// import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSuperAdminCustomerSessionsSessionId(props: {
//   superAdmin: SuperadminPayload;
//   sessionId: string;
// }): Promise<IEcommerceMallCustomerSession> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirstOrThrow({
//     ...EcommerceMallCustomerSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCustomerSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------