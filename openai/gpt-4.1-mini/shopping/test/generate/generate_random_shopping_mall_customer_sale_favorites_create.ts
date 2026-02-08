import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_sale_favorite } from "../prepare/prepare_random_shopping_mall_sale_favorite";

export async function generate_random_shopping_mall_customer_sale_favorites_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSaleFavorite.ICreate> | undefined;
  },
): Promise<IShoppingMallSaleFavorite> {
  const prepared: IShoppingMallSaleFavorite.ICreate =
    prepare_random_shopping_mall_sale_favorite(props.body);
  const result: IShoppingMallSaleFavorite =
    await api.functional.shoppingMall.customer.sale_favorites.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
