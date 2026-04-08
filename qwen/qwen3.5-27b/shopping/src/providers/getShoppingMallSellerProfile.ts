import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCustomerProfileTransformer } from "../transformers/ShoppingMallCustomerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProfile(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallCustomerProfile> {
  const record =
    await MyGlobal.prisma.shopping_mall_customer_profiles.findFirstOrThrow({
      ...ShoppingMallCustomerProfileTransformer.select(),
      where: {
        shopping_mall_customer_id: props.seller.id,
        deleted_at: null,
      },
    });
  return await ShoppingMallCustomerProfileTransformer.transform(record);
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
// import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallSellerProfile(props: {
//   seller: SellerPayload;
// }): Promise<IShoppingMallCustomerProfile> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_profiles.findFirstOrThrow({
//     ...ShoppingMallCustomerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallCustomerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------