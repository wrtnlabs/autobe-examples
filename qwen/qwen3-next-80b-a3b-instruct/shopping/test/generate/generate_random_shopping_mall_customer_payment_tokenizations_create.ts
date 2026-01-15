import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentTokenization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTokenization";
import { prepare_random_shopping_mall_payment_tokenization } from "../prepare/prepare_random_shopping_mall_payment_tokenization";
export async function generate_random_shopping_mall_customer_payment_tokenizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentTokenization.ICreate>;
  },
): Promise<IShoppingMallPaymentTokenization> {
  const prepared: IShoppingMallPaymentTokenization.ICreate =
    prepare_random_shopping_mall_payment_tokenization(props.body);
  const result: IShoppingMallPaymentTokenization =
    await api.functional.shoppingMall.customer.payment_tokenizations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
