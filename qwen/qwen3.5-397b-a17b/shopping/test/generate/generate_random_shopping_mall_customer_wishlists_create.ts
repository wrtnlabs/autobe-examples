import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_wishlist } from "../prepare/prepare_random_shopping_mall_wishlist";

export async function generate_random_shopping_mall_customer_wishlists_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallWishlist.ICreate>;
  },
): Promise<IShoppingMallWishlist> {
  const prepared: IShoppingMallWishlist.ICreate =
    prepare_random_shopping_mall_wishlist(props.body);
  const result: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: prepared,
    });
  return result;
}
