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
  body: IShoppingMallWishlist.IUpdate;
}): Promise<IShoppingMallWishlist> {
  const { customer, wishlistId, body } = props;

  // Verify wishlist exists and belongs to customer
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
  });

  if (!wishlist) {
    throw new HttpException(
      "Wishlist not found or you do not have permission to update it",
      404,
    );
  }

  // Update wishlist with new name if provided
  const updated = await MyGlobal.prisma.shopping_mall_wishlists.update({
    where: { id: wishlistId },
    data: {
      name: body.name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    name: updated.name,
  };
}
