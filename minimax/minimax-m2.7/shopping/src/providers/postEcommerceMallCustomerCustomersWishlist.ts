import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function postEcommerceMallCustomerCustomersWishlist(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.ICreate;
}): Promise<IEcommerceMallWishlistItem> {
  // Get the customer's wishlist
  const wishlist = await MyGlobal.prisma.ecommerce_mall_wishlists.findFirst({
    where: {
      customer: {
        id: props.customer.id,
      },
    },
    select: {
      id: true,
    },
  });
  if (!wishlist) {
    throw new HttpException("Wishlist not found", 404);
  }
  // Validate the product exists and is not soft-deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Check for duplicate wishlist item
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        ecommerce_mall_wishlist_id: wishlist.id,
        ecommerce_mall_product_id: props.body.product_id,
      },
      select: {
        id: true,
      },
    });
  if (existingItem) {
    throw new HttpException("Product already in wishlist", 409);
  }
  // Create new wishlist item using collector
  const created = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
    data: await EcommerceMallWishlistItemCollector.collect({
      body: props.body,
      ecommerceMallWishlists: wishlist,
    }),
    ...EcommerceMallWishlistItemTransformer.select(),
  });
  return await EcommerceMallWishlistItemTransformer.transform(created);
}
