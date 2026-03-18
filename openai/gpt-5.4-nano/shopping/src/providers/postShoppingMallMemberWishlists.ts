import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallWishlistCollector } from "../collectors/ShoppingMallWishlistCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistTransformer } from "../transformers/ShoppingMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberWishlists(props: {
  member: MemberPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  const shoppingMallMember =
    await MyGlobal.prisma.shopping_mall_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true },
    });
  const wishlist = await MyGlobal.prisma.shopping_mall_wishlists.create({
    data: await ShoppingMallWishlistCollector.collect({
      body: props.body,
      shoppingMallMembers: { id: shoppingMallMember.id } satisfies IEntity,
    }),
    ...ShoppingMallWishlistTransformer.select(),
  });
  return await ShoppingMallWishlistTransformer.transform(wishlist);
}
