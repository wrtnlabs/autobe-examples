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
 * Ensure that reading a payment method surcharge with an unknown surchargeId
 * under a valid payment method fails with an error instead of returning a
 * successful configuration payload.
 *
 * Business context
 *
 * - Admins manage payment methods and their surcharges via admin endpoints.
 * - A surcharge is always associated with a payment method (by business code).
 * - When an admin queries a surcharge id that does not exist for that payment
 *   method, the backend must respond with a not-found style error, preventing
 *   any implication that such a record exists.
 *
 * Scenario steps
 *
 * 1. Register and authenticate an admin using POST /auth/admin/join.
 * 2. Create a payment method via POST /shoppingMall/admin/paymentMethods.
 * 3. Create a real surcharge for that method via POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges to
 *    verify that this path and auth work correctly.
 * 4. Generate a random UUID that is (practically) guaranteed not to match any
 *    existing surcharge for that payment method.
 * 5. Call GET
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges/{surchargeId}
 *    with the valid paymentMethodCode and the unknown surchargeId.
 * 6. Assert that the call fails (throws) using TestValidator.error, without
 *    inspecting specific HTTP status codes or error payload internals.
 */
export async function test_api_admin_payment_method_surcharge_read_not_found_for_unknown_surcharge(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Create a real surcharge for that method to ensure path works
  const surchargeCreateBody = {
    scope_code: "global",
    currency_code: "KRW",
    min_order_amount: 0,
    max_order_amount: 500000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const existingSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(existingSurcharge);

  // 4. Generate an unknown surcharge id (UUID) distinct from the real one
  let unknownSurchargeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (unknownSurchargeId === existingSurcharge.id) {
    unknownSurchargeId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5 & 6. Call GET with unknown surcharge id and assert that it fails
  await TestValidator.error(
    "non-existent surcharge read must fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.at(
        connection,
        {
          paymentMethodCode: paymentMethod.code,
          surchargeId: unknownSurchargeId,
        },
      );
    },
  );
}
