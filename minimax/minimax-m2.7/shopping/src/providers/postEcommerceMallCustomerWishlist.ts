import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallWishlistItemCollector } from "../collectors/EcommerceMallWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemTransformer } from "../transformers/EcommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.ICreate;
}): Promise<IEcommerceMallWishlistItem> {
  // Verify product exists and is not deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.body.productId,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Get customer's wishlist to check for duplicates
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findFirstOrThrow({
      where: {
        customer: { id: props.customer.id },
      },
    });
  // Check if product already exists in wishlist
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        ecommerce_mall_wishlist_id: wishlist.id,
        ecommerce_mall_product_id: props.body.productId,
      },
    });
  if (existingItem) {
    throw new HttpException("This product is already in your wishlist", 409);
  }
  // Create wishlist item using collector
  const record = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
    data: await EcommerceMallWishlistItemCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...EcommerceMallWishlistItemTransformer.select(),
  });
  return await EcommerceMallWishlistItemTransformer.transform(record);
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
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerWishlist(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallWishlistItem.ICreate;
// }): Promise<IEcommerceMallWishlistItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
//     data: await EcommerceMallWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallWishlistItemTransformer.select(),
//   });
//   return await EcommerceMallWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------