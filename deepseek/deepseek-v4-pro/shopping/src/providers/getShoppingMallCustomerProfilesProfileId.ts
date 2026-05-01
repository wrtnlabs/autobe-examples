import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerProfilesProfileId(props: {
  customer: CustomerPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfile> {
  const profile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { id: props.profileId },
      ...ShoppingMallSellerProfileTransformer.select(),
    });
  return await ShoppingMallSellerProfileTransformer.transform(profile);
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
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getShoppingMallCustomerProfilesProfileId(props: {
//   customer: CustomerPayload;
//   profileId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallSellerProfile> {
//   const record = await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
//     ...ShoppingMallSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------