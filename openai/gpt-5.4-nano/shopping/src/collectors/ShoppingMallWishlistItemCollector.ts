import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallWishlistItemCollector {
  export async function collect(props: {
    body: IShoppingMallWishlistItem.ICreate;
    wishlist: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      wishlist: {
        connect: { id: props.wishlist.id },
      },
      product: {
        connect: { id: props.body.shopping_mall_product_id },
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsCreateInput;
  }
}
