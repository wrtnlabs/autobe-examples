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
import { ShoppingMallWishlistItemCollector } from "../collectors/ShoppingMallWishlistItemCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistItemTransformer } from "../transformers/ShoppingMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberWishlistItems(props: {
  member: MemberPayload;
  body: IShoppingMallWishlistItem.ICreate;
}): Promise<IShoppingMallWishlistItem> {
  const record = await MyGlobal.prisma.shopping_mall_wishlist_items.create({
    data: await ShoppingMallWishlistItemCollector.collect({
      body: props.body,
      shoppingMallMembers: { id: props.member.id },
      shoppingMallMemberSessions: { id: props.member.session_id },
    }),
    ...ShoppingMallWishlistItemTransformer.select(),
  });
  return await ShoppingMallWishlistItemTransformer.transform(record);
}
