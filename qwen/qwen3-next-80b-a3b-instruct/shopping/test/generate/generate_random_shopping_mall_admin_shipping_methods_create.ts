import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import { prepare_random_shopping_mall_shipping_method } from "../prepare/prepare_random_shopping_mall_shipping_method";
export async function generate_random_shopping_mall_admin_shipping_methods_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShippingMethod.ICreate>;
  },
): Promise<IShoppingMallShippingMethod> {
  const prepared: IShoppingMallShippingMethod.ICreate =
    prepare_random_shopping_mall_shipping_method(props.body);
  const result: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shipping_methods.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
