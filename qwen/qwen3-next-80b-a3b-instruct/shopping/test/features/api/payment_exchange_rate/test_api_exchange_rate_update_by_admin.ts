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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_exchange_rate_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Generate a valid UUID for an existing exchange rate
  // Since no create function is available, we use a randomly generated UUID
  // that represents an existing rate in the system
  const exchangeRateId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the exchange rate with new value and reason for change
  const updatedRate =
    await api.functional.shoppingMall.admin.payment_exchange_rates.update(
      adminConnection,
      {
        exchangeRateId,
        body: {
          reason_for_change: "Market volatility due to economic event",
          is_active: true,
          exchange_rate: 0.87, // Updated rate must be positive and non-zero
        } satisfies IShoppingMallPaymentExchangeRate.IUpdate,
      },
    );
  typia.assert(updatedRate);
  // Step 4: Validate the updated rate has the correct values that are in the response schema
  TestValidator.equals(
    "updated exchange rate matches expected",
    updatedRate.exchange_rate,
    0.87,
  );
  TestValidator.predicate("updated rate is active", updatedRate.is_active);
  TestValidator.equals(
    "updated rate source currency unchanged",
    updatedRate.source_currency_code,
    "USD",
  );
  TestValidator.equals(
    "updated rate target currency unchanged",
    updatedRate.target_currency_code,
    "EUR",
  );
  TestValidator.predicate(
    "updated rate effective from is valid",
    updatedRate.effective_from.length > 0,
  );
  TestValidator.predicate(
    "updated rate created at is valid",
    updatedRate.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated rate updated at is valid",
    updatedRate.updated_at.length > 0,
  );
}
