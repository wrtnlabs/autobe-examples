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
export async function test_api_payment_exchange_rate_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/signup",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminData },
  );
  // Step 2: Generate a realistic exchange rate template to extract a valid ID
  const fakeExchangeRate: IShoppingMallPaymentExchangeRate =
    typia.random<IShoppingMallPaymentExchangeRate>();
  const exchangeRateId: string = fakeExchangeRate.id;
  // Step 3: Retrieve the exchange rate using the generated ID via admin connection
  const retrievedRate: IShoppingMallPaymentExchangeRate =
    await api.functional.shoppingMall.admin.payment_exchange_rates.at(
      adminConnection,
      { exchangeRateId },
    );
  typia.assert(retrievedRate);
  // Step 4: Validate all required fields match the expected schema structure
  TestValidator.equals(
    "source currency code exists",
    retrievedRate.source_currency_code,
    fakeExchangeRate.source_currency_code,
  );
  TestValidator.equals(
    "target currency code exists",
    retrievedRate.target_currency_code,
    fakeExchangeRate.target_currency_code,
  );
  TestValidator.equals(
    "exchange rate exists",
    retrievedRate.exchange_rate,
    fakeExchangeRate.exchange_rate,
  );
  TestValidator.equals(
    "effective from exists",
    retrievedRate.effective_from,
    fakeExchangeRate.effective_from,
  );
  TestValidator.equals(
    "is active exists",
    retrievedRate.is_active,
    fakeExchangeRate.is_active,
  );
  // Also validate structure of optional fields (should be present)
  // Since we cannot control whether these exist in the fake, just verify the response structure is correct
  TestValidator.equals("id matches", retrievedRate.id, exchangeRateId);
}
