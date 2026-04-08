import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function getShoppingMallMemberWishlistItemsWishlistItemId(props: {
  member: MemberPayload;
  wishlistItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallWishlistItem> {
  const record =
    await MyGlobal.prisma.shopping_mall_wishlist_items.findFirstOrThrow({
      where: {
        id: props.wishlistItemId,
        shopping_mall_member_id: props.member.id,
        deleted_at: null,
      },
      ...ShoppingMallWishlistItemTransformer.select(),
    });
  return await ShoppingMallWishlistItemTransformer.transform(record);
}
