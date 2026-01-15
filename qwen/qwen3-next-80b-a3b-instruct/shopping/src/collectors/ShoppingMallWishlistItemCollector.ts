import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallWishlistItemCollector {
  export async function collect(props: {
    body: IShoppingMallWishlistItem.ICreate;
    shoppingMallWishlist: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      wishlist: {
        connect: { id: props.shoppingMallWishlist.id },
      },
      productVariant: {
        connect: { id: props.body.productVariantId },
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsCreateInput;
  }
}
