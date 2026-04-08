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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSellersSellerIdSuspend(props: {
  administrator: AdministratorPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.ISuspendRequest;
}): Promise<IShoppingMallSellerProfile> {
  // Verify seller exists and is not deleted
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
  });
  // Update both seller and seller_profile tables with suspension status atomically
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        suspended: props.body.suspended,
        updated_at: new Date(),
      },
    }),
    MyGlobal.prisma.shopping_mall_seller_profiles.update({
      where: { shopping_mall_seller_id: props.sellerId },
      data: {
        is_suspended: props.body.suspended,
        updated_at: new Date(),
      },
    }),
  ]);
  // Fetch and return the updated seller profile
  const record =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findUniqueOrThrow({
      where: { shopping_mall_seller_id: props.sellerId },
      ...ShoppingMallSellerProfileTransformer.select(),
    });
  return await ShoppingMallSellerProfileTransformer.transform(record);
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
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallAdministratorSellersSellerIdSuspend(props: {
//   administrator: AdministratorPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IShoppingMallSeller.ISuspendRequest;
// }): Promise<IShoppingMallSellerProfile> {
//   const record = await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
//     ...ShoppingMallSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------