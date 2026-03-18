import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallMemberWishlistsWishlistIdItemsWishlistItemId(props: {
  member: MemberPayload;
  wishlistId: string & tags.Format<"uuid">;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const item =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirstOrThrow({
      where: {
        id: props.wishlistItemId,
        shopping_mall_wishlist_id: props.wishlistId,
        deleted_at: null,
        wishlist: {
          id: props.wishlistId,
          shopping_mall_member_id: props.member.id,
          deleted_at: null,
        },
        product: {
          deleted_at: null,
        },
      },
      ...ShoppingMallWishlistItemTransformer.select(),
    });
  return await ShoppingMallWishlistItemTransformer.transform(item);
}
