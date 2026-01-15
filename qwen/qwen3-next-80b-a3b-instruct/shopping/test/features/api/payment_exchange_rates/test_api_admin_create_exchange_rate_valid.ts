import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentExchangeRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentExchangeRate";
import { prepare_random_shopping_mall_payment_exchange_rate } from "../../../prepare/prepare_random_shopping_mall_payment_exchange_rate";
import { generate_random_shopping_mall_admin_payment_exchange_rates_create } from "../../../generate/generate_random_shopping_mall_admin_payment_exchange_rates_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_create_exchange_rate_valid(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/admin/join-${RandomGenerator.alphabets(8)}`,
        referrer: `https://example.com/admin/signup-${RandomGenerator.alphabets(8)}`,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Create exchange rate using the generation utility function
  const exchangeRate: IShoppingMallPaymentExchangeRate =
    await generate_random_shopping_mall_admin_payment_exchange_rates_create(
      adminConnection,
      {
        body: {
          base_currency: "USD",
          target_currency: "EUR",
          rate: 0.85,
        } satisfies IShoppingMallPaymentExchangeRate.ICreate,
      },
    );
  typia.assert(exchangeRate);
  // Validate the created exchange rate has all required properties
  TestValidator.equals(
    "base currency is USD",
    exchangeRate.source_currency_code,
    "USD",
  );
  TestValidator.equals(
    "target currency is EUR",
    exchangeRate.target_currency_code,
    "EUR",
  );
  TestValidator.predicate(
    "exchange rate is positive",
    exchangeRate.exchange_rate > 0,
  );
}