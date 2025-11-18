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
 * Validate that an authenticated admin can create a basic fixed-fee surcharge
 * configuration for a newly created payment method and that the returned
 * surcharge object is correctly linked back to that payment method with
 * persisted configuration fields.
 *
 * Business flow:
 *
 * 1. Join as a new admin using /auth/admin/join to obtain an authenticated admin
 *    context (Authorization header automatically wired by SDK).
 * 2. Create a payment method via /shoppingMall/admin/paymentMethods with a
 *    deterministic business code (e.g., "CARD_CREATE_BASIC").
 * 3. Create a surcharge for that payment method via
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges
 *    representing a simple platform-revenue fixed fee in a specific currency
 *    and order-amount band.
 * 4. Assert that the surcharge response:
 *
 *    - Has a valid id and timestamps (validated via typia.assert).
 *    - References the correct payment method summary (id and code).
 *    - Echoes back the configuration we sent (fixed_fee_amount, currency_code,
 *         min/max order amounts, is_platform_revenue, refundable_policy).
 */
export async function test_api_admin_payment_method_surcharge_creation_basic(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authenticated admin context
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
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create a payment method with a deterministic code
  const paymentMethodCode = "CARD_CREATE_BASIC";
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: `Card Basic ${RandomGenerator.alphabets(5)}`,
    provider_type: "card_processor",
    status: "active",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 100000,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // Basic logical validations on payment method
  TestValidator.equals(
    "payment method code should match input",
    paymentMethod.code,
    paymentMethodCode,
  );
  TestValidator.equals(
    "payment method provider_type should match input",
    paymentMethod.provider_type,
    paymentMethodBody.provider_type,
  );
  TestValidator.equals(
    "payment method status should match input",
    paymentMethod.status,
    paymentMethodBody.status,
  );

  // 3. Create a basic platform-revenue fixed-fee surcharge for the payment method
  const fixedFeeAmount = 1.5;
  const currencyCode = "KRW";
  const minOrderAmount = 0;
  const maxOrderAmount = 100000;
  const scopeCode = "GLOBAL";
  const refundablePolicy = "refundable";

  const surchargeBody = {
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
        paymentMethodCode,
        body: surchargeBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surcharge);

  // 4. Cross-entity linkage and configuration persistence checks
  // Payment method linkage
  TestValidator.equals(
    "surcharge paymentMethod.id should equal created payment method id",
    surcharge.paymentMethod.id,
    paymentMethod.id,
  );
  TestValidator.equals(
    "surcharge paymentMethod.code should equal created payment method code",
    surcharge.paymentMethod.code,
    paymentMethod.code,
  );
  TestValidator.equals(
    "surcharge paymentMethod.display_name should equal created payment method display_name",
    surcharge.paymentMethod.display_name,
    paymentMethod.display_name,
  );
  TestValidator.equals(
    "surcharge paymentMethod.provider_type should equal created payment method provider_type",
    surcharge.paymentMethod.provider_type,
    paymentMethod.provider_type,
  );
  TestValidator.equals(
    "surcharge paymentMethod.status should equal created payment method status",
    surcharge.paymentMethod.status,
    paymentMethod.status,
  );

  // Configuration fields
  TestValidator.equals(
    "surcharge scope_code should match input",
    surcharge.scope_code,
    scopeCode,
  );
  TestValidator.equals(
    "surcharge currency_code should match input",
    surcharge.currency_code,
    currencyCode,
  );
  TestValidator.equals(
    "surcharge min_order_amount should match input",
    surcharge.min_order_amount,
    minOrderAmount,
  );
  TestValidator.equals(
    "surcharge max_order_amount should match input",
    surcharge.max_order_amount,
    maxOrderAmount,
  );
  TestValidator.equals(
    "surcharge fixed_fee_amount should match input",
    surcharge.fixed_fee_amount,
    fixedFeeAmount,
  );
  TestValidator.equals(
    "surcharge refundable_policy should match input",
    surcharge.refundable_policy,
    refundablePolicy,
  );
  TestValidator.predicate(
    "surcharge is_platform_revenue should be true",
    surcharge.is_platform_revenue === true,
  );
}
