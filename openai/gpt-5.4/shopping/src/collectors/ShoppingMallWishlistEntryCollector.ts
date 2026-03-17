import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallWishlistEntryCollector {
  export async function collect(props: {
    body: IShoppingMallWishlistEntry.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: {
        connect: {
          id: props.shoppingMallCustomers.id,
        },
      },
      product: {
        connect: {
          id: props.body.shopping_mall_product_id,
        },
      },
    } satisfies Prisma.shopping_mall_wishlist_entriesCreateInput;
  }
}
