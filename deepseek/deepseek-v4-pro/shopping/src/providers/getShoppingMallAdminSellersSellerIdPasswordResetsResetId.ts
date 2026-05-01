import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerPasswordResetTransformer } from "../transformers/ShoppingMallSellerPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminSellersSellerIdPasswordResetsResetId(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  resetId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerPasswordReset> {
  const record =
    await MyGlobal.prisma.shopping_mall_seller_password_resets.findFirstOrThrow(
      {
        where: {
          id: props.resetId,
          shopping_mall_seller_id: props.sellerId,
        },
        ...ShoppingMallSellerPasswordResetTransformer.select(),
      },
    );
  return await ShoppingMallSellerPasswordResetTransformer.transform(record);
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
// import { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallAdminSellersSellerIdPasswordResetsResetId(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   resetId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallSellerPasswordReset> {
//   const record = await MyGlobal.prisma.shopping_mall_seller_password_resets.findFirstOrThrow({
//     ...ShoppingMallSellerPasswordResetTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerPasswordResetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------