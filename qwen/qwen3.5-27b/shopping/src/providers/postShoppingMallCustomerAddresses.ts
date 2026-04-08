import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCustomerAddressCollector } from "../collectors/ShoppingMallCustomerAddressCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressTransformer } from "../transformers/ShoppingMallCustomerAddressTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerAddress.ICreate;
}): Promise<IShoppingMallCustomerAddress> {
  const record = await MyGlobal.prisma.shopping_mall_customer_addresses.create({
    data: await ShoppingMallCustomerAddressCollector.collect({
      body: props.body,
      shoppingMallCustomers: props.customer,
    }),
    ...ShoppingMallCustomerAddressTransformer.select(),
  });
  return await ShoppingMallCustomerAddressTransformer.transform(record);
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
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerAddress.ICreate;
// }): Promise<IShoppingMallCustomerAddress> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_addresses.create({
//     data: await ShoppingMallCustomerAddressCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCustomerAddressTransformer.select(),
//   });
//   return await ShoppingMallCustomerAddressTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------