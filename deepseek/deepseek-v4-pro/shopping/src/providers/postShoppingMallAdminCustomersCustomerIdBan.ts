import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminCustomersCustomerIdBan(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: { id: true, banned_at: true },
    });
  if (customer.banned_at !== null) {
    throw new HttpException("Customer is already banned", 409);
  }
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customerId },
    data: {
      banned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      ...ShoppingMallCustomerTransformer.select(),
    });
  return await ShoppingMallCustomerTransformer.transform(updated);
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
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdminCustomersCustomerIdBan(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCustomer> {
//   const record = await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
//     ...ShoppingMallCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------