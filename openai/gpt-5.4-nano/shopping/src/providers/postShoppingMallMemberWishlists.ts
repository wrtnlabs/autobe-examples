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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallWishlistTransformer } from "../transformers/ShoppingMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberWishlists(props: {
  member: MemberPayload;
  body: IShoppingMallWishlist.ICreate;
}): Promise<IShoppingMallWishlist> {
  const memberRecord = await MyGlobal.prisma.shopping_mall_members.findFirst({
    where: { id: props.member.id, deleted_at: null },
    select: { id: true },
  });
  if (memberRecord === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const requestedProductIds = (props.body.items ?? []).map(
    (item) => item.shopping_mall_product_id,
  );
  const uniqueProductIds = Array.from(new Set(requestedProductIds));
  if (uniqueProductIds.length > 0) {
    const existing = await MyGlobal.prisma.shopping_mall_products.findMany({
      where: { id: { in: uniqueProductIds }, deleted_at: null },
      select: { id: true },
    });
    const existingSet = new Set(existing.map((p) => p.id));
    const missing = uniqueProductIds.filter((id) => !existingSet.has(id));
    if (missing.length > 0) {
      throw new HttpException("Product not available", 400);
    }
  }
  const wishlist = await MyGlobal.prisma.$transaction(async (tx) => {
    const wishlistId = typia.assert<string & tags.Format<"uuid">>(v4());
    const createdAt = new Date();
    return tx.shopping_mall_wishlists.create({
      data: {
        id: wishlistId,
        shopping_mall_member_id: props.member.id,
        created_at: createdAt,
        updated_at: createdAt,
        deleted_at: null,
        ...(uniqueProductIds.length > 0
          ? {
              items: {
                create: uniqueProductIds.map((productId) => ({
                  id: typia.assert<string & tags.Format<"uuid">>(v4()),
                  created_at: new Date(),
                  updated_at: new Date(),
                  deleted_at: null,
                  shopping_mall_product_id: productId,
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        shopping_mall_member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  });
  return ShoppingMallWishlistTransformer.transform(wishlist);
}
