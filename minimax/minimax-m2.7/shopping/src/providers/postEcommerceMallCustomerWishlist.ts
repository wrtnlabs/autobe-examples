import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { EcommerceMallWishlistItemAtInvertTransformer } from "../transformers/EcommerceMallWishlistItemAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.ICreate;
}): Promise<IEcommerceMallWishlistItem.IInvert> {
  // Step 1: Get customer's wishlist (one-to-one relationship)
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findFirstOrThrow({
      where: {
        customer: {
          id: props.customer.id,
        },
      },
      select: {
        id: true,
      },
    });
  // Step 2: Verify product exists and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
    where: {
      id: props.body.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // Step 3: Check if wishlist item already exists (idempotent behavior)
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        ecommerce_mall_wishlist_id: wishlist.id,
        ecommerce_mall_product_id: props.body.productId,
      },
      ...EcommerceMallWishlistItemAtInvertTransformer.select(),
    });
  if (existingItem !== null) {
    return await EcommerceMallWishlistItemAtInvertTransformer.transform(
      existingItem,
    );
  }
  // Step 4: Create new wishlist item
  const created = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
    data: await EcommerceMallWishlistItemCollector.collect({
      body: props.body,
      wishlist: wishlist,
    }),
    ...EcommerceMallWishlistItemAtInvertTransformer.select(),
  });
  return await EcommerceMallWishlistItemAtInvertTransformer.transform(created);
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerWishlist(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallWishlistItem.ICreate;
// }): Promise<IEcommerceMallWishlistItem.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
//     data: await EcommerceMallWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallWishlistItemAtInvertTransformer.select(),
//   });
//   return await EcommerceMallWishlistItemAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------