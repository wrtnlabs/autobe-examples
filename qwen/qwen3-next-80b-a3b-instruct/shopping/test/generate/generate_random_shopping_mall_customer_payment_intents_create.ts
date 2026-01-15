import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import type { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";
import { prepare_random_shopping_mall_payment_intent } from "../prepare/prepare_random_shopping_mall_payment_intent";
export async function generate_random_shopping_mall_customer_payment_intents_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentIntent.ICreate>;
  },
): Promise<IShoppingMallPaymentIntent> {
  const prepared: IShoppingMallPaymentIntent.ICreate =
    prepare_random_shopping_mall_payment_intent(props.body);
  return await api.functional.shoppingMall.customer.payment_intents.create(
    connection,
    {
      body: prepared,
    },
  );
}
