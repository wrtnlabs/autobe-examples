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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerResubmission(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSeller> {
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    const seller = await tx.shopping_mall_sellers.findFirstOrThrow({
      where: { id: props.seller.id },
      select: {
        id: true,
        approval_status: true,
        banned_at: true,
      },
    });
    if (seller.banned_at !== null) {
      throw new HttpException("Forbidden", 403);
    }
    if (seller.approval_status === "pending") {
      throw new HttpException("Registration is already awaiting review.", 409);
    }
    if (seller.approval_status === "approved") {
      throw new HttpException("Seller is already approved.", 409);
    }
    await tx.shopping_mall_sellers.update({
      where: { id: props.seller.id },
      data: {
        approval_status: "pending",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      },
    });
    return await tx.shopping_mall_sellers.findFirstOrThrow({
      where: { id: props.seller.id },
      ...ShoppingMallSellerTransformer.select(),
    });
  });
  return await ShoppingMallSellerTransformer.transform(updated);
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
// export async function postShoppingMallSellerResubmission(props: {
//   seller: SellerPayload;
// }): Promise<IShoppingMallSeller> {
//   const record = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
//     ...ShoppingMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------