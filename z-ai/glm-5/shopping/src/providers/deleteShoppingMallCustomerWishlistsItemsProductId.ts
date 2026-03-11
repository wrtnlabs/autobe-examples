import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerWishlistsItemsProductId(props: {
  customer: CustomerPayload;
  productId: string;
}): Promise<void> {
  // Find customer's wishlist
  const wishlist =
    await MyGlobal.prisma.shopping_mall_wishlists.findUniqueOrThrow({
      where: {
        shopping_mall_customer_id: props.customer.id,
      },
    });
  // Find the wishlist item to delete
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findUnique({
      where: {
        shopping_mall_wishlist_id_shopping_mall_product_id: {
          shopping_mall_wishlist_id: wishlist.id,
          shopping_mall_product_id: props.productId,
        },
      },
    });
  if (wishlistItem === null) {
    throw new HttpException("Product not found in wishlist", 404);
  }
  // Delete the wishlist item
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: {
      id: wishlistItem.id,
    },
  });
  // Update wishlist's updated_at timestamp
  await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: {
      id: wishlist.id,
    },
    data: {
      updated_at: new Date(),
    },
  });
}
