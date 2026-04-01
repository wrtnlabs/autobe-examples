import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallWishlistItemCollector } from "./ShoppingMallWishlistItemCollector";

export namespace ShoppingMallWishlistCollector {
  export async function collect(props: {
    body: IShoppingMallWishlist.ICreate;
    member: IEntity;
  }) {
    const now = new Date();
    return {
      id: v4(),
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.member.id } },
      items:
        props.body.items && props.body.items.length > 0
          ? {
              create: await ArrayUtil.asyncMap(props.body.items, (item, i) =>
                ShoppingMallWishlistItemCollector.collect({
                  body: item,
                  sequence: i,
                  wishlist: { id: undefined as never },
                } as any),
              ),
            }
          : undefined,
    } satisfies Prisma.shopping_mall_wishlistsCreateInput;
  }
}
