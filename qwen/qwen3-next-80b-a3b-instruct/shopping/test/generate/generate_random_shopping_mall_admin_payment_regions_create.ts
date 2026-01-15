import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
import { prepare_random_shopping_mall_payment_region } from "../prepare/prepare_random_shopping_mall_payment_region";
export async function generate_random_shopping_mall_admin_payment_regions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentRegion.ICreate>;
  },
): Promise<IShoppingMallPaymentRegion> {
  const prepared: IShoppingMallPaymentRegion.ICreate =
    prepare_random_shopping_mall_payment_region(props.body);
  return await api.functional.shoppingMall.admin.payment_regions.create(
    connection,
    {
      body: prepared,
    },
  );
}
