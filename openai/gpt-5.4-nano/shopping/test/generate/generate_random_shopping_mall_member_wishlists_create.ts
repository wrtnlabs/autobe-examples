import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_wishlist } from "../prepare/prepare_random_shopping_mall_wishlist";

export async function generate_random_shopping_mall_member_wishlists_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallWishlist.ICreate> | undefined;
  },
): Promise<IShoppingMallWishlist> {
  const prepared: IShoppingMallWishlist.ICreate =
    prepare_random_shopping_mall_wishlist(props.body);
  return await api.functional.shoppingMall.member.wishlists.create(connection, {
    body: prepared,
  });
}
