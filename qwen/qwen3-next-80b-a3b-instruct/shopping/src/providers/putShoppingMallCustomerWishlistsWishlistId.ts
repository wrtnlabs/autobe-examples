import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  // Validate the wishlist exists and belongs to the customer
  const existing = await MyGlobal.prisma.shopping_mall_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });

  if (!existing) {
    throw new HttpException("Wishlist not found", 404);
  }

  // Update only the updated_at timestamp
  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: {
      id: props.wishlistId,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    name: updated.name,
  };
}
