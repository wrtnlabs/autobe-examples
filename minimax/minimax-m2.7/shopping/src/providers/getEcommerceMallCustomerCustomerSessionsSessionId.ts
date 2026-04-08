import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCustomerSessionTransformer } from "../transformers/EcommerceMallCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomerSession> {
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirst({
      ...EcommerceMallCustomerSessionTransformer.select(),
      where: {
        id: props.sessionId,
        ecommerce_mall_customer_id: props.customer.id,
        expired_at: {
          gt: new Date(),
        },
      },
    });
  if (session === null) {
    throw new HttpException("Session not found or expired", 404);
  }
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
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomerSessionsSessionId(props: {
//   customer: CustomerPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallCustomerSession> {
//   const record = await MyGlobal.prisma.ecommerce_mall_customer_sessions.findFirstOrThrow({
//     ...EcommerceMallCustomerSessionTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCustomerSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------