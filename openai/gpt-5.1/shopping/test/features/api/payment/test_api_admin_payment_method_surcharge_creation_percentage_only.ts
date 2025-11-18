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
 * Validate that admins can create percentage-only payment method surcharges.
 *
 * Business goal
 *
 * - Ensure an authorized admin can:
 *
 *   1. Create a payment method, and
 *   2. Register one or more surcharge rules that use only percentage_fee_rate (no
 *        fixed_fee_amount) and have realistic currency and order amount
 *        constraints.
 * - Confirm that the persisted surcharge correctly reflects the requested
 *   configuration and that multiple percentage-only surcharges can coexist for
 *   non-overlapping order amount ranges.
 *
 * Scenario outline
 *
 * 1. Admin registration
 *
 *    - Call POST /auth/admin/join with a random but valid
 *         IShoppingMallAdminJoin.ICreate payload to obtain an
 *         IShoppingMallAdmin.IAuthorized context.
 *    - The SDK will automatically inject the access token into the connection
 *         headers; we just need to assert the response structure.
 * 2. Payment method creation
 *
 *    - Create a payment method via POST /shoppingMall/admin/paymentMethods using
 *         IShoppingMallPaymentMethod.ICreate, with:
 *
 *         - Code: deterministic value, e.g. "CARD_PCT_ONLY_" + random tail,
 *         - Display_name: random paragraph/name,
 *         - Provider_type: some string like "card_processor",
 *         - Optional bounds (min_amount, max_amount) to a broad range to not interfere
 *                   with surcharge ranges,
 *         - Status: "active" so it is considered usable.
 *    - Assert the created payment method matches core fields (code, display_name,
 *         provider_type, status).
 * 3. Percentage-only surcharge creation
 *
 *    - Invoke POST /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges
 *         via
 *         api.functional.shoppingMall.admin.paymentMethods.surcharges.create
 *         with:
 *
 *         - PaymentMethodCode: paymentMethod.code from step 2,
 *         - Body: IShoppingMallPaymentMethodSurcharge.ICreate with:
 *
 *                           - Currency_code: e.g. "KRW",
 *                           - Min_order_amount: e.g. 1_000,
 *                           - Max_order_amount: e.g. 100_000,
 *                           - Fixed_fee_amount: omitted (to be persisted as null),
 *                           - Percentage_fee_rate: a positive number, e.g. 2.9,
 *                           - Is_platform_revenue: false,
 *                           - Refundable_policy: e.g. "refundable".
 *    - Assert the response type using typia.assert.
 *    - Validate via TestValidator that:
 *
 *         - Percentage_fee_rate equals the requested rate,
 *         - Fixed_fee_amount is null or undefined,
 *         - Is_platform_revenue equals the requested flag,
 *         - Currency_code, min_order_amount, and max_order_amount equal the requested
 *                   values,
 *         - PaymentMethod.code equals the parent payment method code.
 * 4. Multiple non-overlapping percentage-only surcharges
 *
 *    - Create a second surcharge for the same payment method with a different
 *         non-overlapping order amount band, e.g.:
 *
 *         - Min_order_amount: 100_001,
 *         - Max_order_amount: 1_000_000,
 *         - Same percentage_fee_rate and is_platform_revenue,
 *         - Same currency_code.
 *    - Assert it is created successfully and also matches the requested
 *         configuration.
 *    - We do not assert any particular ordering between surcharges, only that both
 *         creations succeed and reflect the expected values.
 */
export async function test_api_admin_payment_method_surcharge_creation_percentage_only(
  connection: api.IConnection,
) {
  // 1. Admin registration to obtain authorized admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "Password123!", // meets password string requirements
    href: "https://admin.example.com/join", // valid URI
    referrer: "https://admin.example.com/landing", // valid URI
    // ip is optional; omit to let backend derive if it wants
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method that will own the surcharges
  const paymentMethodCode = `CARD_PCT_ONLY_${RandomGenerator.alphaNumeric(8)}`;

  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD", // simple CSV expression
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 10_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  TestValidator.equals(
    "created payment method code should match requested code",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create first percentage-only surcharge
  const percentageRate1 = 2.9;
  const minAmount1 = 1_000;
  const maxAmount1 = 100_000;

  const surchargeBody1 = {
    // scope_code omitted (treated as null)
    currency_code: "KRW",
    min_order_amount: minAmount1,
    max_order_amount: maxAmount1,
    // fixed_fee_amount intentionally omitted for percentage-only rule
    percentage_fee_rate: percentageRate1,
    is_platform_revenue: false,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge1: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeBody1,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surcharge1);

  // Business validations for surcharge1
  TestValidator.equals(
    "surcharge1 percentage_fee_rate should equal requested rate",
    surcharge1.percentage_fee_rate,
    percentageRate1,
  );

  TestValidator.predicate(
    "surcharge1 fixed_fee_amount should be null or undefined for percentage-only rule",
    surcharge1.fixed_fee_amount === null ||
      surcharge1.fixed_fee_amount === undefined,
  );

  TestValidator.equals(
    "surcharge1 is_platform_revenue should match requested flag",
    surcharge1.is_platform_revenue,
    false,
  );

  TestValidator.equals(
    "surcharge1 currency_code should match requested value",
    surcharge1.currency_code,
    surchargeBody1.currency_code,
  );

  TestValidator.equals(
    "surcharge1 min_order_amount should match requested value",
    surcharge1.min_order_amount,
    minAmount1,
  );

  TestValidator.equals(
    "surcharge1 max_order_amount should match requested value",
    surcharge1.max_order_amount,
    maxAmount1,
  );

  TestValidator.equals(
    "surcharge1 paymentMethod.code should match parent payment method code",
    surcharge1.paymentMethod.code,
    paymentMethod.code,
  );

  // 4. Create a second, non-overlapping percentage-only surcharge
  const percentageRate2 = 2.9; // same rate, different range
  const minAmount2 = maxAmount1 + 1;
  const maxAmount2 = 1_000_000;

  const surchargeBody2 = {
    currency_code: "KRW",
    min_order_amount: minAmount2,
    max_order_amount: maxAmount2,
    percentage_fee_rate: percentageRate2,
    is_platform_revenue: false,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge2: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeBody2,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surcharge2);

  TestValidator.equals(
    "surcharge2 percentage_fee_rate should equal requested rate",
    surcharge2.percentage_fee_rate,
    percentageRate2,
  );

  TestValidator.predicate(
    "surcharge2 fixed_fee_amount should be null or undefined for percentage-only rule",
    surcharge2.fixed_fee_amount === null ||
      surcharge2.fixed_fee_amount === undefined,
  );

  TestValidator.equals(
    "surcharge2 is_platform_revenue should match requested flag",
    surcharge2.is_platform_revenue,
    false,
  );

  TestValidator.equals(
    "surcharge2 currency_code should match requested value",
    surcharge2.currency_code,
    surchargeBody2.currency_code,
  );

  TestValidator.equals(
    "surcharge2 min_order_amount should match requested value",
    surcharge2.min_order_amount,
    minAmount2,
  );

  TestValidator.equals(
    "surcharge2 max_order_amount should match requested value",
    surcharge2.max_order_amount,
    maxAmount2,
  );

  TestValidator.equals(
    "surcharge2 paymentMethod.code should match parent payment method code",
    surcharge2.paymentMethod.code,
    paymentMethod.code,
  );
}
