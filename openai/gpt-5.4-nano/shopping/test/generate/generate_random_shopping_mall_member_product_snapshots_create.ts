import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_snapshot } from "../prepare/prepare_random_shopping_mall_product_snapshot";

export async function generate_random_shopping_mall_member_product_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductSnapshot.ICreate> | undefined;
  },
): Promise<IShoppingMallProductSnapshot> {
  const prepared: IShoppingMallProductSnapshot.ICreate =
    prepare_random_shopping_mall_product_snapshot(props.body);
  const result: IShoppingMallProductSnapshot =
    await api.functional.shoppingMall.member.productSnapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
