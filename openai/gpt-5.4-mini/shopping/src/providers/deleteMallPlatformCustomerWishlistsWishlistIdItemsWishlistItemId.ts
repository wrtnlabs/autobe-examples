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

export async function deleteMallPlatformCustomerWishlistsWishlistIdItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const wishlist = await MyGlobal.prisma.mall_platform_wishlists.findUnique({
    where: {
      id: props.wishlistId,
      customer_id: props.customer.id,
    },
    select: {
      id: true,
      customer_id: true,
    },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  const item = await MyGlobal.prisma.mall_platform_wishlist_items.findFirst({
    where: {
      id: props.wishlistItemId,
      mall_platform_wishlist_id: wishlist.id,
    },
    select: {
      id: true,
    },
  });
  if (item === null) return;
  await MyGlobal.prisma.mall_platform_wishlist_items.delete({
    where: {
      id: item.id,
    },
  });
}
