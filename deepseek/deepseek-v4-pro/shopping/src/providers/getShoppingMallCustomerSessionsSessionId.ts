import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerSessionTransformer } from "../transformers/ShoppingMallCustomerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerSessionsSessionId(props: {
  customer: CustomerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...ShoppingMallCustomerSessionTransformer.select(),
    });
  if (session.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallCustomerSessionTransformer.transform(session);
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
// import { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerSessionsSessionId(props: {
//   customer: CustomerPayload;
//   sessionId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCustomerSession> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_sessions.findFirstOrThrow({
//     ...ShoppingMallCustomerSessionTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCustomerSessionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------