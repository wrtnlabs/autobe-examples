import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPackageDimensions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPackageDimensions";
import type { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
import { prepare_random_shopping_mall_shipping_tracking } from "../prepare/prepare_random_shopping_mall_shipping_tracking";
export async function generate_random_shopping_mall_customer_shipping_trackings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallShippingTracking.ICreate>;
  },
): Promise<IShoppingMallShippingTracking> {
  const prepared: IShoppingMallShippingTracking.ICreate =
    prepare_random_shopping_mall_shipping_tracking(props.body);
  return await api.functional.shoppingMall.customer.shipping_trackings.create(
    connection,
    {
      body: prepared,
    },
  );
}
