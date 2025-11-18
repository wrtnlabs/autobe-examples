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
 * Validate that updating a payment method surcharge requires admin
 * authentication.
 *
 * Business goals:
 *
 * - Ensure that only authenticated admins can modify surcharge configuration.
 * - Confirm that unauthenticated update attempts fail with an error.
 * - Demonstrate that the endpoint works when called with a valid admin context.
 *
 * Scenario overview:
 *
 * 1. Register and authenticate an admin using POST /auth/admin/join.
 * 2. As that admin, create a payment method via POST
 *    /shoppingMall/admin/paymentMethods.
 * 3. Still as the authenticated admin, create a surcharge on that payment method
 *    via POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges.
 * 4. Clone the connection into an unauthenticated variant with empty headers.
 * 5. Build an IShoppingMallPaymentMethodSurcharge.IUpdate payload that changes at
 *    least one field compared to the created surcharge.
 * 6. Attempt to call PUT
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges/{surchargeId}
 *    using the unauthenticated connection and assert, via TestValidator.error,
 *    that an error is thrown.
 * 7. Call the same update endpoint again using the original authenticated admin
 *    connection with a different update payload and assert that it succeeds and
 *    returns an updated IShoppingMallPaymentMethodSurcharge.
 * 8. Use TestValidator.notEquals to ensure the authenticated update actually
 *    changed at least one field (e.g., fixed_fee_amount or refundable_policy)
 *    compared to the original surcharge, verifying that the endpoint is
 *    functional when properly authenticated.
 */
export async function test_api_admin_payment_method_surcharge_update_requires_auth(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create payment method as authenticated admin
  const paymentMethodBody = {
    code: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Create surcharge for the payment method as authenticated admin
  const surchargeCreateBody = {
    scope_code: RandomGenerator.alphaNumeric(6),
    currency_code: "KRW",
    min_order_amount: 10000,
    max_order_amount: 500000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 1.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const createdSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(createdSurcharge);

  // 4. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 5. Build an update payload that changes one or more fields
  const unauthorizedUpdateBody = {
    fixed_fee_amount: (createdSurcharge.fixed_fee_amount ?? 0) + 100,
    percentage_fee_rate: (createdSurcharge.percentage_fee_rate ?? 0) + 0.5,
    refundable_policy: "non_refundable_after_unauth_attempt",
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  // 6. Attempt unauthorized update and assert that it fails
  await TestValidator.error(
    "unauthenticated admin surcharge update must be rejected",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
        unauthenticatedConnection,
        {
          paymentMethodCode: paymentMethod.code,
          surchargeId: createdSurcharge.id,
          body: unauthorizedUpdateBody,
        },
      );
    },
  );

  // 7. Perform an authenticated update to show the endpoint works with valid auth
  const authenticatedUpdateBody = {
    fixed_fee_amount: (createdSurcharge.fixed_fee_amount ?? 0) + 200,
    percentage_fee_rate: (createdSurcharge.percentage_fee_rate ?? 0) + 1.0,
    refundable_policy: "refundable_after_auth_update",
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  const updatedSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        surchargeId: createdSurcharge.id,
        body: authenticatedUpdateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(updatedSurcharge);

  // 8. Validate that at least one field actually changed after authenticated update
  TestValidator.notEquals<IShoppingMallPaymentMethodSurcharge>(
    "authenticated update should modify surcharge configuration",
    createdSurcharge,
    updatedSurcharge,
  );
}
