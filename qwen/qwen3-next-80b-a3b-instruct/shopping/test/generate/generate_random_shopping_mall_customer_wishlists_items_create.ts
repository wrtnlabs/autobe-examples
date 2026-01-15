import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { prepare_random_shopping_mall_wishlist_item } from "../prepare/prepare_random_shopping_mall_wishlist_item";
export async function generate_random_shopping_mall_customer_wishlists_items_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallWishlistItem.ICreate> | undefined;
    params: {
      wishlistId: string;
    };
  },
): Promise<IShoppingMallWishlistItem> {
  const prepared: IShoppingMallWishlistItem.ICreate =
    prepare_random_shopping_mall_wishlist_item(props.body);
  return await api.functional.shoppingMall.customer.wishlists.items.create(
    connection,
    {
      body: prepared,
      wishlistId: props.params.wishlistId,
    },
  );
}
