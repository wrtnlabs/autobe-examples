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
 * Validate that an authenticated admin can create a fixed-fee surcharge
 * configuration for a specific payment method.
 *
 * Business context:
 *
 * - Admins configure payment methods (e.g., card gateways) and may attach
 *   surcharge rules that affect checkout pricing and platform revenue.
 * - This test ensures the happy path for creating a surcharge that is purely a
 *   fixed fee (no percentage component) tied to a payment method code.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin using /auth/admin/join.
 * 2. Create a payment method using /shoppingMall/admin/paymentMethods.
 * 3. Create a fixed-fee surcharge for that payment method using
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges.
 * 4. Assert that the surcharge is created correctly and references the expected
 *    payment method, with the configured fee fields intact.
 */
export async function test_api_admin_payment_method_surcharge_create_success_fixed_fee(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method
  const paymentMethodCodeBase = "card_gateway_kr";
  const paymentMethodCodeSuffix = RandomGenerator.alphaNumeric(8);
  const paymentMethodCode = `${paymentMethodCodeBase}_${paymentMethodCodeSuffix}`;

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Korean Card Gateway",
    provider_type: "card_processor",
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  TestValidator.equals(
    "payment method code should match requested code",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create a fixed-fee surcharge for the created payment method
  const fixedFeeAmount = 1000;
  const minOrderAmount = 0;
  const maxOrderAmount = 1_000_000;
  const scopeCode = "default_scope";
  const currencyCode = "KRW";
  const refundablePolicy = "non_refundable";

  const surchargeCreateBody = {
    scope_code: scopeCode,
    currency_code: currencyCode,
    min_order_amount: minOrderAmount,
    max_order_amount: maxOrderAmount,
    fixed_fee_amount: fixedFeeAmount,
    is_platform_revenue: true,
    refundable_policy: refundablePolicy,
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethodCode,
        body: surchargeCreateBody,
      },
    );
  typia.assert(surcharge);

  // 4. Business-level assertions on the created surcharge
  TestValidator.predicate(
    "surcharge id should be a non-empty string",
    typeof surcharge.id === "string" && surcharge.id.length > 0,
  );

  TestValidator.equals(
    "surcharge payment method code should match created payment method",
    surcharge.paymentMethod.code,
    paymentMethodCode,
  );

  TestValidator.equals(
    "fixed fee amount should match configured value",
    surcharge.fixed_fee_amount,
    fixedFeeAmount,
  );

  TestValidator.equals(
    "is_platform_revenue should be true as configured",
    surcharge.is_platform_revenue,
    true,
  );

  TestValidator.equals(
    "refundable_policy should match configured value",
    surcharge.refundable_policy,
    refundablePolicy,
  );

  // percentage_fee_rate should be effectively absent (null or undefined)
  TestValidator.predicate(
    "percentage_fee_rate should be null or undefined when omitted in create",
    surcharge.percentage_fee_rate === null ||
      surcharge.percentage_fee_rate === undefined,
  );

  // Validate that min/max order amounts in response respect configured band
  TestValidator.equals(
    "min_order_amount should match configured minimum",
    surcharge.min_order_amount,
    minOrderAmount,
  );

  TestValidator.equals(
    "max_order_amount should match configured maximum",
    surcharge.max_order_amount,
    maxOrderAmount,
  );
}
