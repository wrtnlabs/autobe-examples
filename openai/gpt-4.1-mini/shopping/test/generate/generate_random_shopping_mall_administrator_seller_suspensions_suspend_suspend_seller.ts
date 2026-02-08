import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_suspension } from "../prepare/prepare_random_shopping_mall_seller_suspension";

export async function generate_random_shopping_mall_administrator_seller_suspensions_suspend_suspend_seller(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerSuspension.ICreate> | undefined;
    params: {
      sellerId: string;
    };
  },
): Promise<IShoppingMallSellerSuspension> {
  const prepared: IShoppingMallSellerSuspension.ICreate =
    prepare_random_shopping_mall_seller_suspension(props.body);
  const result: IShoppingMallSellerSuspension =
    await api.functional.shoppingMall.administrator.seller_suspensions.suspend.suspendSeller(
      connection,
      {
        sellerId: props.params.sellerId,
        body: prepared,
      },
    );
  return result;
}
