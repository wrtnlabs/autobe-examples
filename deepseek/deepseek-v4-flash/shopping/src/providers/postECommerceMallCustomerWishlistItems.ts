import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallWishlistItemCollector } from "../collectors/ECommerceMallWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallWishlistItemTransformer } from "../transformers/ECommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IECommerceMallWishlistItem.ICreate;
}): Promise<IECommerceMallWishlistItem> {
  const product = await MyGlobal.prisma.e_commerce_mall_products.findFirst({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
    select: {
      id: true,
      visibility: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or has been deleted", 404);
  }
  if (product.visibility === "deleted" || product.visibility === "suspended") {
    throw new HttpException("Product is not available for wishlist", 422);
  }
  const existing =
    await MyGlobal.prisma.e_commerce_mall_wishlist_items.findFirst({
      where: {
        e_commerce_mall_customer_id: props.customer.id,
        e_commerce_mall_product_id: props.body.product_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Product is already in your wishlist", 409);
  }
  const record = await MyGlobal.prisma.e_commerce_mall_wishlist_items.create({
    data: await ECommerceMallWishlistItemCollector.collect({
      body: props.body,
      customer: { id: props.customer.id },
      session: { id: props.customer.session_id },
    }),
    ...ECommerceMallWishlistItemTransformer.select(),
  });
  return await ECommerceMallWishlistItemTransformer.transform(record);
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
// import { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerWishlistItems(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallWishlistItem.ICreate;
// }): Promise<IECommerceMallWishlistItem> {
//   const record = await MyGlobal.prisma.e_commerce_mall_wishlist_items.create({
//     data: await ECommerceMallWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallWishlistItemTransformer.select(),
//   });
//   return await ECommerceMallWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------