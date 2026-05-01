import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallWishlistItemCollector } from "../collectors/ShoppingMallWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
    select: {
      id: true,
      seller: {
        select: {
          suspended_at: true,
        },
      },
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller.suspended_at !== null) {
    throw new HttpException("Seller is suspended", 422);
  }
  const existing = await MyGlobal.prisma.shopping_mall_wishlist_items.findFirst(
    {
      where: {
        shopping_mall_customer_id: props.customer.id,
        shopping_mall_product_id: props.body.product_id,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  const record = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: await ShoppingMallWishlistItemCollector.collect({
      body: props.body,
      shoppingMallCustomers: { id: props.customer.id },
      shoppingMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...ShoppingMallWishlistItemTransformer.select(),
  });
  return await ShoppingMallWishlistItemTransformer.transform(record);
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
// import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallCustomerWishlistItems(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallWishlistItem.ICreate;
// }): Promise<IShoppingMallWishlistItem> {
//   const record = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
//     data: await ShoppingMallWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallWishlistItemTransformer.select(),
//   });
//   return await ShoppingMallWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------