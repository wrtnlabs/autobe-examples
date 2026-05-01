import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const displayName = props.body.display_name.trim();
  if (displayName.length === 0) {
    throw new HttpException("Display name must not be blank", 422);
  }
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: props.customer.id },
    data: {
      display_name: displayName,
      ...(props.body.phone_number !== undefined
        ? { phone_number: props.body.phone_number }
        : {}),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
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
// export async function putShoppingMallCustomerProfile(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomer.IUpdate;
// }): Promise<IShoppingMallCustomer> {
//   await MyGlobal.prisma.shopping_mall_customers.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCustomerTransformer.select(),
//   });
//   return await ShoppingMallCustomerTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------