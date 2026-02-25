import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_profile_snapshot } from "../prepare/prepare_random_shopping_mall_seller_profile_snapshot";

export async function generate_random_shopping_mall_administrator_seller_profile_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerProfileSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallSellerProfileSnapshot> {
  const prepared: IShoppingMallSellerProfileSnapshot.ICreate =
    prepare_random_shopping_mall_seller_profile_snapshot(props.body);
  const result: IShoppingMallSellerProfileSnapshot =
    await api.functional.shoppingMall.administrator.sellerProfileSnapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
