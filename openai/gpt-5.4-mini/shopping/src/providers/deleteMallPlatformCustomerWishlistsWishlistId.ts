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

export async function deleteMallPlatformCustomerWishlistsWishlistId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const wishlist = await prisma.mall_platform_wishlists.findUniqueOrThrow({
      where: { id: props.wishlistId },
      select: {
        id: true,
        customer_id: true,
      },
    });
    if (wishlist.customer_id !== props.customer.id) {
      throw new HttpException("Forbidden", 403);
    }
    await prisma.mall_platform_wishlist_items.deleteMany({
      where: {
        mall_platform_wishlist_id: props.wishlistId,
      },
    });
    await prisma.mall_platform_wishlists.delete({
      where: {
        id: props.wishlistId,
      },
    });
  });
}
