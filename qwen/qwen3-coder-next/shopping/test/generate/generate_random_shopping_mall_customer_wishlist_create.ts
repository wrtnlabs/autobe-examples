import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_wishlist } from "../prepare/prepare_random_shopping_mall_customer_wishlist";

export async function generate_random_shopping_mall_customer_wishlist_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerWishlist.ICreate> | undefined;
  },
): Promise<IShoppingMallCustomerWishlist> {
  const prepared: IShoppingMallCustomerWishlist.ICreate =
    prepare_random_shopping_mall_customer_wishlist(props.body);
  return await api.functional.shoppingMall.customer.wishlist.create(
    connection,
    {
      body: prepared,
    },
  );
}
