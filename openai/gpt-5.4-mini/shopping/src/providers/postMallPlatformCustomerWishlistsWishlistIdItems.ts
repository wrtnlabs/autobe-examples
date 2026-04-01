import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformWishlistItemCollector } from "../collectors/MallPlatformWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistItemTransformer } from "../transformers/MallPlatformWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformCustomerWishlistsWishlistIdItems(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  body: IMallPlatformWishlistItem.ICreate;
}): Promise<IMallPlatformWishlistItem> {
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
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
    await prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.body.mallPlatformProductId },
      select: { id: true },
    });
    const existing = await prisma.mall_platform_wishlist_items.findFirst({
      where: {
        mall_platform_wishlist_id: props.wishlistId,
        mall_platform_product_id: props.body.mallPlatformProductId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Conflict", 409);
    }
    return await prisma.mall_platform_wishlist_items.create({
      data: await MallPlatformWishlistItemCollector.collect({
        body: props.body,
        wishlist: { id: props.wishlistId },
      }),
      ...MallPlatformWishlistItemTransformer.select(),
    });
  });
  return await MallPlatformWishlistItemTransformer.transform(created);
}
