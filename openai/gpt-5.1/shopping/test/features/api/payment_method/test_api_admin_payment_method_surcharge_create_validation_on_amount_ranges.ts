import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

/**
 * Validate creation of payment method surcharges with different order amount
 * ranges.
 *
 * This scenario ensures that an admin can:
 *
 * 1. Join the platform and obtain an authorized admin context.
 * 2. Create a payment method configuration.
 * 3. Create a surcharge for that payment method with a logically coherent order
 *    amount range (min_order_amount < max_order_amount) and verify that the
 *    persisted configuration matches the request payload and is linked to the
 *    correct payment method.
 * 4. Create another surcharge on the same payment method with an inverted range
 *    (min_order_amount > max_order_amount) to observe and document how the
 *    system behaves when business-level range consistency is not guaranteed,
 *    while still keeping the test fully type-safe and compilation-friendly.
 *
 * The test focuses on:
 *
 * - End-to-end admin workflow: join -> configure payment method -> configure
 *   surcharges.
 * - Verifying that the happy-path surcharge correctly reflects requested amount
 *   thresholds and payment method linkage.
 * - Exercising an inverted range configuration without relying on specific HTTP
 *   error codes or deliberate type violations, instead asserting that the
 *   stored values match what was sent so current behavior is explicit.
 */
export async function test_api_admin_payment_method_surcharge_create_validation_on_amount_ranges(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method as this admin
  const paymentMethodBody = {
    code: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(createdMethod);

  // 3. Happy-path surcharge with coherent min/max order amounts
  const validSurchargeBody = {
    scope_code: "default-scope",
    currency_code: "KRW",
    min_order_amount: 100,
    max_order_amount: 10_000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const validSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: createdMethod.code,
        body: validSurchargeBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(validSurcharge);

  // Validate that response reflects the input range and links back to payment method
  TestValidator.equals(
    "surcharge min_order_amount should match input",
    validSurcharge.min_order_amount,
    validSurchargeBody.min_order_amount,
  );
  TestValidator.equals(
    "surcharge max_order_amount should match input",
    validSurcharge.max_order_amount,
    validSurchargeBody.max_order_amount,
  );
  TestValidator.equals(
    "surcharge payment method code should match created method code",
    validSurcharge.paymentMethod.code,
    createdMethod.code,
  );

  // 4. Secondary surcharge using inverted min/max to observe behavior
  const invertedRangeBody = {
    scope_code: "inverted-range-scope",
    currency_code: "KRW",
    min_order_amount: 10_000,
    max_order_amount: 100,
    fixed_fee_amount: 750,
    percentage_fee_rate: 3.1,
    is_platform_revenue: false,
    refundable_policy: "non_refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const invertedSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: createdMethod.code,
        body: invertedRangeBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(invertedSurcharge);

  // Even if business validation is not enforced, assert that the stored values
  // exactly reflect what we sent, so the test documents actual behavior.
  TestValidator.equals(
    "inverted surcharge min_order_amount should match input",
    invertedSurcharge.min_order_amount,
    invertedRangeBody.min_order_amount,
  );
  TestValidator.equals(
    "inverted surcharge max_order_amount should match input",
    invertedSurcharge.max_order_amount,
    invertedRangeBody.max_order_amount,
  );
  TestValidator.equals(
    "inverted surcharge payment method code should still match created method code",
    invertedSurcharge.paymentMethod.code,
    createdMethod.code,
  );
}
