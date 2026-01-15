import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { prepare_random_shopping_mall_payment_surcharge_rule } from "../prepare/prepare_random_shopping_mall_payment_surcharge_rule";
export async function generate_random_shopping_mall_admin_payment_surcharge_rules_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentSurchargeRule.ICreate>;
  },
): Promise<IShoppingMallPaymentSurchargeRule> {
  const prepared: IShoppingMallPaymentSurchargeRule.ICreate =
    prepare_random_shopping_mall_payment_surcharge_rule(props.body);
  return await api.functional.shoppingMall.admin.payment_surcharge_rules.create(
    connection,
    {
      body: prepared,
    },
  );
}
