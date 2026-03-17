import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_wishlist_entry } from "../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function generate_random_shopping_mall_customer_wishlist_entries_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallWishlistEntry.ICreate> | undefined;
  },
): Promise<IShoppingMallWishlistEntry> {
  const prepared: IShoppingMallWishlistEntry.ICreate =
    prepare_random_shopping_mall_wishlist_entry(props.body);
  const result: IShoppingMallWishlistEntry =
    await api.functional.shoppingMall.customer.wishlistEntries.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
