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

export async function deleteShoppingMallCustomerWishlistsItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify ownership by finding wishlist item with customer's wishlist
  const wishlistItem =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirstOrThrow({
      where: {
        id: props.wishlistItemId,
        wishlist: {
          shopping_mall_customer_id: props.customer.id,
        },
      },
    });
  // Delete the wishlist item
  await MyGlobal.prisma.shopping_mall_wishlist_items.delete({
    where: { id: wishlistItem.id },
  });
}
