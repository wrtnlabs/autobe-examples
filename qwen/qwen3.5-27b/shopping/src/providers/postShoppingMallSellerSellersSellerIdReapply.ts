import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerProfileTransformer } from "../transformers/ShoppingMallSellerProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSellersSellerIdReapply(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerProfile> {
  // Verify the seller profile exists and the authenticated user is the seller themselves
  const profile =
    await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
      where: {
        id: props.sellerId,
        deleted_at: null,
        shopping_mall_seller_id: props.seller.id,
      },
      select: {
        id: true,
        approval_status: true,
      },
    });
  // Check that the seller's current approval status is 'rejected'
  if (profile.approval_status !== "rejected") {
    throw new HttpException(
      "Seller can only reapply when status is 'rejected'",
      400,
    );
  }
  // Update the profile: set approval_status to 'pending', clear rejection_reason, update timestamp
  const updated = await MyGlobal.prisma.shopping_mall_seller_profiles.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "pending",
      rejection_reason: null,
      updated_at: new Date(),
    },
    ...ShoppingMallSellerProfileTransformer.select(),
  });
  return await ShoppingMallSellerProfileTransformer.transform(updated);
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerSellersSellerIdReapply(props: {
//   seller: SellerPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallSellerProfile> {
//   const record = await MyGlobal.prisma.shopping_mall_seller_profiles.findFirstOrThrow({
//     ...ShoppingMallSellerProfileTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerProfileTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------