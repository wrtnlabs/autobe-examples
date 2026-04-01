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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformWishlistItemTransformer } from "../transformers/MallPlatformWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerWishlistsWishlistIdItemsWishlistItemId(props: {
  customer: CustomerPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformWishlistItem> {
  await MyGlobal.prisma.mall_platform_wishlists.findFirstOrThrow({
    where: {
      id: props.wishlistId,
      deleted_at: null,
    },
  });
  const item =
    await MyGlobal.prisma.mall_platform_wishlist_items.findUniqueOrThrow({
      where: {
        id: props.wishlistItemId,
        mall_platform_wishlist_id_mall_platform_product_id: {
          mall_platform_wishlist_id: props.wishlistId,
          mall_platform_product_id: props.wishlistId,
        },
      },
      ...MallPlatformWishlistItemTransformer.select(),
    });
  return await MallPlatformWishlistItemTransformer.transform(item);
}
