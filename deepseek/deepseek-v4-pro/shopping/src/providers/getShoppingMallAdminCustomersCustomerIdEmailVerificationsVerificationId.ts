import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallCustomerEmailVerificationTransformer } from "../transformers/ShoppingMallCustomerEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminCustomersCustomerIdEmailVerificationsVerificationId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findFirstOrThrow(
      {
        where: {
          id: props.verificationId,
          shopping_mall_customer_id: props.customerId,
        },
        ...ShoppingMallCustomerEmailVerificationTransformer.select(),
      },
    );
  return await ShoppingMallCustomerEmailVerificationTransformer.transform(
    record,
  );
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
// import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminCustomersCustomerIdEmailVerificationsVerificationId(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   verificationId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallCustomerEmailVerification> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_email_verifications.findFirstOrThrow({
//     ...ShoppingMallCustomerEmailVerificationTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCustomerEmailVerificationTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------