import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceWishlistItemCollector } from "../collectors/EcommerceWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceWishlistItemTransformer } from "../transformers/EcommerceWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IEcommerceWishlistItem.ICreate;
}): Promise<IEcommerceWishlistItem> {
  // 1. Verify wishlist exists, not soft-deleted, and belongs to customer
  const wishlist = await MyGlobal.prisma.ecommerce_wishlists.findUnique({
    where: { id: props.wishlistId },
    select: { id: true, ecommerce_customer_id: true, deleted_at: true },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.deleted_at !== null) {
    throw new HttpException("Wishlist not found", 404);
  }
  if (wishlist.ecommerce_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.body.ecommerce_product_id },
    select: { id: true, deleted_at: true },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 3. Check for duplicate wishlist item
  const existing = await MyGlobal.prisma.ecommerce_wishlist_items.findFirst({
    where: {
      ecommerce_wishlist_id: props.wishlistId,
      ecommerce_product_id: props.body.ecommerce_product_id,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // 4. Create wishlist item using collector
  const record = await MyGlobal.prisma.ecommerce_wishlist_items.create({
    data: await EcommerceWishlistItemCollector.collect({
      body: props.body,
      ecommerceWishlists: { id: wishlist.id } satisfies IEntity,
    }),
    ...EcommerceWishlistItemTransformer.select(),
  });
  // 5. Transform and return
  return await EcommerceWishlistItemTransformer.transform(record);
}
