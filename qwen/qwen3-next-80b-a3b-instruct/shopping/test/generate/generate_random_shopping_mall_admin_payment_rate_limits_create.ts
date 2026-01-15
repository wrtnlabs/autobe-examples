import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRateLimit";
import { prepare_random_shopping_mall_payment_rate_limit } from "../prepare/prepare_random_shopping_mall_payment_rate_limit";
export async function generate_random_shopping_mall_admin_payment_rate_limits_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentRateLimit.ICreate> | undefined;
  },
): Promise<IShoppingMallPaymentRateLimit> {
  const prepared: IShoppingMallPaymentRateLimit.ICreate =
    prepare_random_shopping_mall_payment_rate_limit(props.body);
  return await api.functional.shoppingMall.admin.payment_rate_limits.create(
    connection,
    {
      body: prepared,
    },
  );
}
