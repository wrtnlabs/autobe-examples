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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemTransformer } from "../transformers/EcommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.ICreate;
}): Promise<IEcommerceMallWishlistItem> {
  // Validate product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.body.productId },
    select: { id: true, deleted_at: true },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Get customer's wishlist ID (one-to-one with customer)
  const wishlist =
    await MyGlobal.prisma.ecommerce_mall_wishlists.findFirstOrThrow({
      where: { customer: { id: props.customer.id } },
      select: { id: true },
    });
  // Check for existing wishlist item (composite unique constraint)
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findUnique({
      where: {
        ecommerce_mall_wishlist_id_ecommerce_mall_product_id: {
          ecommerce_mall_wishlist_id: wishlist.id,
          ecommerce_mall_product_id: props.body.productId,
        },
      },
      select: { id: true },
    });
  if (existingItem !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // Create wishlist item
  const created = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
    data: {
      id: v4(),
      created_at: new Date(),
      wishlist: { connect: { id: wishlist.id } },
      product: { connect: { id: props.body.productId } },
    },
    ...EcommerceMallWishlistItemTransformer.select(),
  });
  return await EcommerceMallWishlistItemTransformer.transform(created);
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
// export async function postEcommerceMallCustomerCustomersMeWishlist(props: {
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