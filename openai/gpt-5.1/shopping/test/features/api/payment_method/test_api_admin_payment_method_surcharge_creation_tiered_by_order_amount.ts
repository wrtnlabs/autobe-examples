import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

export async function test_api_admin_payment_method_surcharge_creation_tiered_by_order_amount(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain authorized connection
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method with a stable code
  const paymentMethodCode = "CARD_TIERED";
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Tiered Card Payment",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  TestValidator.equals(
    "payment method code should match requested code",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create tiered surcharge rules for this payment method
  // Tier 1: 0 <= amount < 100 with fixed fee
  const tier1Request = {
    scope_code: "default",
    currency_code: "KRW",
    min_order_amount: 0,
    max_order_amount: 100,
    fixed_fee_amount: 1.0,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const tier1: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: tier1Request,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(tier1);

  // Tier 2: 100 <= amount < 500 with percentage fee
  const tier2Request = {
    scope_code: "default",
    currency_code: "KRW",
    min_order_amount: 100,
    max_order_amount: 500,
    percentage_fee_rate: 1.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const tier2: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: tier2Request,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(tier2);

  // Tier 3: 500 <= amount with percentage fee and no upper bound
  const tier3Request = {
    scope_code: "default",
    currency_code: "KRW",
    min_order_amount: 500,
    percentage_fee_rate: 2.0,
    is_platform_revenue: false,
    refundable_policy: "non_refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const tier3: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: tier3Request,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(tier3);

  // 4. Validate all surcharges belong to the same payment method and have distinct ids
  TestValidator.equals(
    "tier1 payment method code matches created method",
    tier1.paymentMethod.code,
    paymentMethod.code,
  );
  TestValidator.equals(
    "tier2 payment method code matches created method",
    tier2.paymentMethod.code,
    paymentMethod.code,
  );
  TestValidator.equals(
    "tier3 payment method code matches created method",
    tier3.paymentMethod.code,
    paymentMethod.code,
  );

  TestValidator.notEquals(
    "tier1 and tier2 ids should be distinct",
    tier1.id,
    tier2.id,
  );
  TestValidator.notEquals(
    "tier1 and tier3 ids should be distinct",
    tier1.id,
    tier3.id,
  );
  TestValidator.notEquals(
    "tier2 and tier3 ids should be distinct",
    tier2.id,
    tier3.id,
  );

  // 5. Validate tier range configuration from responses
  TestValidator.equals(
    "tier1 min_order_amount should be 0",
    tier1.min_order_amount,
    0,
  );
  TestValidator.equals(
    "tier1 max_order_amount should be 100",
    tier1.max_order_amount,
    100,
  );
  TestValidator.equals(
    "tier1 fixed_fee_amount should be 1.0",
    tier1.fixed_fee_amount,
    1.0,
  );
  TestValidator.equals(
    "tier1 percentage_fee_rate should be null or undefined",
    tier1.percentage_fee_rate ?? null,
    null,
  );

  TestValidator.equals(
    "tier2 min_order_amount should be 100",
    tier2.min_order_amount,
    100,
  );
  TestValidator.equals(
    "tier2 max_order_amount should be 500",
    tier2.max_order_amount,
    500,
  );
  TestValidator.equals(
    "tier2 fixed_fee_amount should be null or undefined",
    tier2.fixed_fee_amount ?? null,
    null,
  );
  TestValidator.equals(
    "tier2 percentage_fee_rate should be 1.5",
    tier2.percentage_fee_rate,
    1.5,
  );

  TestValidator.equals(
    "tier3 min_order_amount should be 500",
    tier3.min_order_amount,
    500,
  );
  TestValidator.equals(
    "tier3 max_order_amount should be null or undefined (open upper bound)",
    tier3.max_order_amount ?? null,
    null,
  );
  TestValidator.equals(
    "tier3 fixed_fee_amount should be null or undefined",
    tier3.fixed_fee_amount ?? null,
    null,
  );
  TestValidator.equals(
    "tier3 percentage_fee_rate should be 2.0",
    tier3.percentage_fee_rate,
    2.0,
  );

  // 6. Validate adjacency relationships between tiers
  TestValidator.equals(
    "tier1 upper bound should match tier2 lower bound",
    tier1.max_order_amount,
    tier2.min_order_amount,
  );
  TestValidator.equals(
    "tier2 upper bound should match tier3 lower bound",
    tier2.max_order_amount,
    tier3.min_order_amount,
  );
}
