import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerPasswordResetTransformer } from "../transformers/ShoppingMallCustomerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCustomersCustomerIdPasswordResetsResetId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  resetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerPasswordReset> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_password_resets.findFirstOrThrow(
      {
        where: { id: props.resetId },
        ...ShoppingMallCustomerPasswordResetTransformer.select(),
      },
    );
  if (record.customer.id !== props.customerId) {
    throw new HttpException("Not Found", 404);
  }
  return await ShoppingMallCustomerPasswordResetTransformer.transform(record);
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
// import { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminCustomersCustomerIdPasswordResetsResetId(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCustomerPasswordReset> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_password_resets.findFirstOrThrow({
//     ...ShoppingMallCustomerPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCustomerPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------