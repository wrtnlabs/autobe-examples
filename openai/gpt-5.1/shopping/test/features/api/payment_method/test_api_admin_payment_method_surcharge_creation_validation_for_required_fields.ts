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
 * Validate creation of a payment method surcharge under an admin context.
 *
 * Business goal:
 *
 * - Ensure an authenticated admin can create a payment method, then attach a
 *   surcharge to it using coherent numeric ranges and the required
 *   is_platform_revenue flag.
 * - Verify that the created surcharge echoes back the configuration we sent
 *   (association to the correct payment method code and matching business
 *   fields).
 *
 * Scenario steps:
 *
 * 1. Admin join: register a new admin with POST /auth/admin/join. This call also
 *    sets the Authorization header on the shared connection so that subsequent
 *    admin endpoints are authenticated.
 * 2. Create payment method: call POST /shoppingMall/admin/paymentMethods with a
 *    deterministic code such as "CARD_VALIDATION" so that we can later refer to
 *    this method via its code when creating the surcharge.
 * 3. Build a valid surcharge payload: construct an
 *    IShoppingMallPaymentMethodSurcharge.ICreate object that:
 *
 *    - Sets a scope_code and currency_code string,
 *    - Uses coherent numeric ranges (min_order_amount <= max_order_amount),
 *    - Uses non-negative fixed_fee_amount,
 *    - Uses a small positive percentage_fee_rate,
 *    - Sets is_platform_revenue explicitly (required field),
 *    - Sets a refundable_policy string.
 * 4. Create surcharge: call POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges through
 *    api.functional.shoppingMall.admin.paymentMethods.surcharges.create,
 *    passing the paymentMethod.code from step 2 as path parameter and the
 *    surcharge create payload as body.
 * 5. Validate response:
 *
 *    - Typia.assert on the returned IShoppingMallPaymentMethodSurcharge.
 *    - Use TestValidator.equals to ensure key business fields on the response match
 *         the request body: scope_code, currency_code, min_order_amount,
 *         max_order_amount, fixed_fee_amount, percentage_fee_rate,
 *         is_platform_revenue, refundable_policy.
 *    - Use TestValidator.equals to ensure the returned paymentMethod.code in the
 *         surcharge matches the payment method code created in step 2.
 */
export async function test_api_admin_payment_method_surcharge_creation_validation_for_required_fields(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // any string is okay for password format tag
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method with deterministic business code
  const paymentMethodCode = `CARD_VALIDATION_${RandomGenerator.alphaNumeric(6)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Card Validation Method",
    description: "Payment method used for surcharge validation tests",
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Build a valid surcharge payload with coherent numeric ranges
  const surchargeCreateBody = {
    scope_code: "GLOBAL",
    currency_code: "KRW",
    min_order_amount: 10000,
    max_order_amount: 500000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  // 4. Create surcharge for the specific payment method code
  const surcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surcharge);

  // 5. Validate that the surcharge reflects the input payload and association
  TestValidator.equals(
    "surcharge is associated with the expected payment method code",
    surcharge.paymentMethod.code,
    paymentMethod.code,
  );

  TestValidator.equals(
    "surcharge.scope_code should match request",
    surcharge.scope_code,
    surchargeCreateBody.scope_code,
  );
  TestValidator.equals(
    "surcharge.currency_code should match request",
    surcharge.currency_code,
    surchargeCreateBody.currency_code,
  );
  TestValidator.equals(
    "surcharge.min_order_amount should match request",
    surcharge.min_order_amount,
    surchargeCreateBody.min_order_amount,
  );
  TestValidator.equals(
    "surcharge.max_order_amount should match request",
    surcharge.max_order_amount,
    surchargeCreateBody.max_order_amount,
  );
  TestValidator.equals(
    "surcharge.fixed_fee_amount should match request",
    surcharge.fixed_fee_amount,
    surchargeCreateBody.fixed_fee_amount,
  );
  TestValidator.equals(
    "surcharge.percentage_fee_rate should match request",
    surcharge.percentage_fee_rate,
    surchargeCreateBody.percentage_fee_rate,
  );
  TestValidator.equals(
    "surcharge.is_platform_revenue should match request",
    surcharge.is_platform_revenue,
    surchargeCreateBody.is_platform_revenue,
  );
  TestValidator.equals(
    "surcharge.refundable_policy should match request",
    surcharge.refundable_policy,
    surchargeCreateBody.refundable_policy,
  );
}
