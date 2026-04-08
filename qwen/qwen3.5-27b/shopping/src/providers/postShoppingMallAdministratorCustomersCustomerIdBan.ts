import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorCustomersCustomerIdBan(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomer.IBanRequest;
}): Promise<IShoppingMallCustomer> {
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: props.customerId,
      deleted_at: null,
    },
    data: {
      banned: props.body.banned,
      updated_at: new Date(),
    },
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
// import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdministratorCustomersCustomerIdBan(props: {
//   administrator: AdministratorPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IShoppingMallCustomer.IBanRequest;
// }): Promise<IShoppingMallCustomer> {
//   const record = await MyGlobal.prisma.shopping_mall_customers.findFirstOrThrow({
//     ...ShoppingMallCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------