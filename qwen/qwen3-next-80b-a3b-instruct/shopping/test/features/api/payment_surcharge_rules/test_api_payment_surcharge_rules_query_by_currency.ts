import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentSurchargeRule";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSurchargeRule";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_surcharge_rules_query_by_currency(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Generate multiple payment surcharge rules with different currencies
  // Create at least 5 rules in each currency to ensure filtering works
  const usdRules = ArrayUtil.repeat(5, () => {
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_method_type: RandomGenerator.pick([
        "credit_card",
        "crypto",
        "bank_transfer",
        "digital_wallet",
      ] as const),
      country_code: "US",
      currency_code: "USD",
      surcharge_percentage: typia.random<number & tags.Minimum<0>>(),
      effective_from: new Date().toISOString(),
      is_active: true,
      priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    } satisfies IShoppingMallPaymentSurchargeRule.ISummary;
  });
  const eurRules = ArrayUtil.repeat(5, () => {
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_method_type: RandomGenerator.pick([
        "credit_card",
        "crypto",
        "bank_transfer",
        "digital_wallet",
      ] as const),
      country_code: "EU",
      currency_code: "EUR",
      surcharge_percentage: typia.random<number & tags.Minimum<0>>(),
      effective_from: new Date().toISOString(),
      is_active: true,
      priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    } satisfies IShoppingMallPaymentSurchargeRule.ISummary;
  });
  const krwRules = ArrayUtil.repeat(5, () => {
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      payment_method_type: RandomGenerator.pick([
        "credit_card",
        "crypto",
        "bank_transfer",
        "digital_wallet",
      ] as const),
      country_code: "KR",
      currency_code: "KRW",
      surcharge_percentage: typia.random<number & tags.Minimum<0>>(),
      effective_from: new Date().toISOString(),
      is_active: true,
      priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    } satisfies IShoppingMallPaymentSurchargeRule.ISummary;
  });
  // Step 3: Create request body with currency filter set to USD
  const request: IShoppingMallPaymentSurchargeRule.IRequest = {
    currency: "USD",
  };
  // Step 4: Call the payment surcharge rules endpoint with admin connection
  const response: IPageIShoppingMallPaymentSurchargeRule.ISummary =
    await api.functional.shoppingMall.admin.payment_surcharge_rules.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // Step 5: Validate that all returned rules have currency_code equal to 'USD'
  // and no rules with other currencies are present
  const usdRulesInResponse = response.data.filter(
    (rule) => rule.currency_code === "USD",
  );
  const nonUsdRulesInResponse = response.data.filter(
    (rule) => rule.currency_code !== "USD",
  );
  TestValidator.equals(
    "expected USD rules count",
    usdRulesInResponse.length,
    5,
  );
  TestValidator.equals(
    "no non-USD rules in response",
    nonUsdRulesInResponse.length,
    0,
  );
  // Step 6: Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records is positive",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages > 0,
  );
  // Step 7: Validate that rules are sorted by created_at in descending order (default)
  // Check that rules are ordered by created_at from newest to oldest
  for (let i = 0; i < usdRulesInResponse.length - 1; i++) {
    const current = new Date(usdRulesInResponse[i].effective_from);
    const next = new Date(usdRulesInResponse[i + 1].effective_from);
    TestValidator.predicate(
      "rules sorted by created_at descending",
      current >= next,
    );
  }
  // Step 8: Verify all rules are active and have valid surcharge percentage
  for (const rule of response.data) {
    TestValidator.predicate("rule is active", rule.is_active);
    TestValidator.predicate(
      "surcharge percentage is non-negative",
      rule.surcharge_percentage >= 0,
    );
    TestValidator.predicate("priority is at least 1", rule.priority >= 1);
    TestValidator.equals("currency code is USD", rule.currency_code, "USD");
  }
}