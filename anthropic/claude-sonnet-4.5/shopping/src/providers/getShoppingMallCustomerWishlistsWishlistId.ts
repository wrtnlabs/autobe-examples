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

export async function getShoppingMallCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlist> {
  const { customer, wishlistId } = props;

  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.findFirst({
    where: {
      id: wishlistId,
      shopping_mall_customer_id: customer.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!wishlist) {
    throw new HttpException(
      "Wishlist not found or you do not have permission to access it",
      404,
    );
  }

  return {
    id: wishlist.id as string & tags.Format<"uuid">,
    name: wishlist.name,
  };
}
