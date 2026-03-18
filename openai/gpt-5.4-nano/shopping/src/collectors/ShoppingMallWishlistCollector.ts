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
    shoppingMallMembers: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const items: Prisma.shopping_mall_wishlistsCreateInput["items"] = props.body
      .items?.length
      ? {
          create: await ArrayUtil.asyncMap(
            props.body.items,
            async (item: IShoppingMallWishlistItem.ICreate) =>
              ShoppingMallWishlistItemCollector.collect({
                body: item,
                wishlist: { id } as IEntity,
              }),
          ),
        }
      : undefined;
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: { id: props.shoppingMallMembers.id },
      },
      items,
    } satisfies Prisma.shopping_mall_wishlistsCreateInput;
  }
}
