import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import { prepare_random_shopping_mall_payment_transaction } from "../prepare/prepare_random_shopping_mall_payment_transaction";
export async function generate_random_shopping_mall_customer_payments_transactions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentTransaction.ICreate> | undefined;
  },
): Promise<IShoppingMallPaymentTransaction> {
  const prepared: IShoppingMallPaymentTransaction.ICreate =
    prepare_random_shopping_mall_payment_transaction(props.body);
  return await api.functional.shoppingMall.customer.payments.transactions.create(
    connection,
    {
      body: prepared,
    },
  );
}
