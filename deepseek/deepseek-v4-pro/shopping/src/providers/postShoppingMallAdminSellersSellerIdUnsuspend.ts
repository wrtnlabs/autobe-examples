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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSellersSellerIdUnsuspend(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      id: true,
      suspended_at: true,
      approval_status: true,
      banned_at: true,
      deleted_at: true,
    },
  });
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account has been deleted", 404);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 409);
  }
  if (seller.suspended_at === null) {
    throw new HttpException("Seller is not currently suspended", 409);
  }
  if (seller.banned_at !== null) {
    throw new HttpException("Cannot unsuspend a banned seller", 409);
  }
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      suspended_at: null,
      updated_at: new Date(),
    },
  });
  const record = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    ...ShoppingMallSellerTransformer.select(),
    where: { id: props.sellerId },
  });
  return await ShoppingMallSellerTransformer.transform(record);
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
// export async function postShoppingMallAdminSellersSellerIdUnsuspend(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IShoppingMallSeller> {
//   const record = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
//     ...ShoppingMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------