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

export async function postMallPlatformCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IMallPlatformWishlistItem.ICreate;
}): Promise<IMallPlatformWishlistItem> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const wishlist = await prisma.mall_platform_wishlists.findFirstOrThrow({
      where: {
        customer: {
          id: props.customer.id,
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const product = await prisma.mall_platform_products.findFirst({
      where: {
        id: props.body.mallPlatformProductId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (product === null) {
      throw new HttpException(
        "Product is unavailable for wishlist saving",
        400,
      );
    }
    const existing = await prisma.mall_platform_wishlist_items.findFirst({
      where: {
        mall_platform_wishlist_id: wishlist.id,
        mall_platform_product_id: props.body.mallPlatformProductId,
        deleted_at: null,
      },
      ...MallPlatformWishlistItemTransformer.select(),
    });
    if (existing !== null) {
      return await MallPlatformWishlistItemTransformer.transform(existing);
    }
    try {
      const created = await prisma.mall_platform_wishlist_items.create({
        data: await MallPlatformWishlistItemCollector.collect({
          body: props.body,
          wishlist: {
            id: wishlist.id,
          },
        }),
        ...MallPlatformWishlistItemTransformer.select(),
      });
      return await MallPlatformWishlistItemTransformer.transform(created);
    } catch (error) {
      const duplicate = await prisma.mall_platform_wishlist_items.findFirst({
        where: {
          mall_platform_wishlist_id: wishlist.id,
          mall_platform_product_id: props.body.mallPlatformProductId,
          deleted_at: null,
        },
        ...MallPlatformWishlistItemTransformer.select(),
      });
      if (duplicate !== null) {
        return await MallPlatformWishlistItemTransformer.transform(duplicate);
      }
      throw error;
    }
  });
}
