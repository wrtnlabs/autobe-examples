import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_payment_attempt } from "../prepare/prepare_random_shopping_mall_payment_attempt";

export async function generate_random_shopping_mall_customer_payment_attempts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentAttempt.ICreate> | undefined;
  },
): Promise<IShoppingMallPaymentAttempt> {
  const prepared: IShoppingMallPaymentAttempt.ICreate =
    prepare_random_shopping_mall_payment_attempt(props.body);
  const result: IShoppingMallPaymentAttempt =
    await api.functional.shoppingMall.customer.paymentAttempts.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
