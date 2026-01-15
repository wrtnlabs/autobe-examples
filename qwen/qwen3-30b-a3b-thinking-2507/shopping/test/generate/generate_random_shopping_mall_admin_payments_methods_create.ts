import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { prepare_random_shopping_mall_payment_method } from "../prepare/prepare_random_shopping_mall_payment_method";
export async function generate_random_shopping_mall_admin_payments_methods_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentMethod.ICreate> | undefined;
  },
): Promise<IShoppingMallPaymentMethod> {
  const prepared: IShoppingMallPaymentMethod.ICreate =
    prepare_random_shopping_mall_payment_method(props.body);
  return await api.functional.shoppingMall.admin.payments.methods.create(
    connection,
    {
      body: prepared,
    },
  );
}
