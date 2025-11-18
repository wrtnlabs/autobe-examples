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
 * Validate creation of a percentage-based payment method surcharge by an admin.
 *
 * Business goal:
 *
 * - Ensure that an authenticated admin can create a payment method, and then
 *   attach a percentage-based surcharge configuration to it.
 * - Verify that the surcharge response reflects the requested percentage_fee_rate
 *   and associated configuration fields.
 *
 * Scenario steps:
 *
 * 1. Register (join) an admin account to obtain an authenticated admin context.
 * 2. Create a payment method with a unique business code.
 * 3. Create a surcharge for that payment method, focusing on percentage_fee_rate
 *    configuration.
 * 4. Assert that the returned surcharge entity matches the requested configuration
 *    and is linked to the correct payment method.
 */
export async function test_api_admin_payment_method_surcharge_create_success_percentage_fee(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
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
  typia.assert(adminAuthorized);

  // 2. Create a payment method that will own the surcharge
  const paymentMethodCode = `international_card_${RandomGenerator.alphaNumeric(8)}`;

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "International Card",
    description: "Card processor for international transactions",
    provider_type: "card_processor",
    allowed_currencies: "USD,EUR,KRW",
    allowed_countries: "US,KR,DE",
    min_amount: 1000,
    max_amount: 100000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  TestValidator.equals(
    "created payment method code matches request",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create a percentage-based surcharge for this payment method
  const requestedPercentageFeeRate = 2.5;
  const requestedFixedFeeAmount = 0;
  const requestedMinOrderAmount = 1000;
  const requestedMaxOrderAmount = 100000;
  const requestedScopeCode = "global";
  const requestedCurrencyCode = "USD";
  const requestedRefundablePolicy = "refundable_partial";
  const requestedIsPlatformRevenue = true;

  const surchargeBody = {
    scope_code: requestedScopeCode,
    currency_code: requestedCurrencyCode,
    min_order_amount: requestedMinOrderAmount,
    max_order_amount: requestedMaxOrderAmount,
    fixed_fee_amount: requestedFixedFeeAmount,
    percentage_fee_rate: requestedPercentageFeeRate,
    is_platform_revenue: requestedIsPlatformRevenue,
    refundable_policy: requestedRefundablePolicy,
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: surchargeBody,
      },
    );
  typia.assert(surcharge);

  // 4. Business assertions on created surcharge
  TestValidator.equals(
    "surcharge is linked to correct payment method code",
    surcharge.paymentMethod.code,
    paymentMethodCode,
  );

  TestValidator.equals(
    "surcharge percentage_fee_rate matches request",
    surcharge.percentage_fee_rate,
    requestedPercentageFeeRate,
  );

  TestValidator.equals(
    "surcharge fixed_fee_amount matches request",
    surcharge.fixed_fee_amount,
    requestedFixedFeeAmount,
  );

  TestValidator.equals(
    "surcharge min_order_amount matches request",
    surcharge.min_order_amount,
    requestedMinOrderAmount,
  );

  TestValidator.equals(
    "surcharge max_order_amount matches request",
    surcharge.max_order_amount,
    requestedMaxOrderAmount,
  );

  TestValidator.equals(
    "surcharge scope_code matches request",
    surcharge.scope_code,
    requestedScopeCode,
  );

  TestValidator.equals(
    "surcharge currency_code matches request",
    surcharge.currency_code,
    requestedCurrencyCode,
  );

  TestValidator.equals(
    "surcharge is_platform_revenue matches request",
    surcharge.is_platform_revenue,
    requestedIsPlatformRevenue,
  );

  TestValidator.equals(
    "surcharge refundable_policy matches request",
    surcharge.refundable_policy,
    requestedRefundablePolicy,
  );

  // created_at and updated_at are validated structurally by typia.assert,
  // so no additional manual validation is required here.
}
