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
 * Ensure surcharge read operations are scoped to the correct payment method.
 *
 * Business goal:
 *
 * - Validate that a surcharge configuration created for one payment method cannot
 *   be fetched via a different payment method code, thereby enforcing the
 *   parent–child relationship between payment method and surcharge.
 *
 * High-level flow:
 *
 * 1. Register an admin with POST /auth/admin/join to obtain an authorized admin
 *    context (token is automatically wired into the connection).
 * 2. Create two distinct payment methods via POST
 *    /shoppingMall/admin/paymentMethods (e.g., card vs bank transfer).
 * 3. For the first method, create a surcharge via POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges and
 *    capture its id.
 * 4. Positive control: read that surcharge back using GET
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges/{surchargeId}
 *    with the correct paymentMethodCode and verify it matches expectations.
 * 5. Negative case: attempt to read the same surcharge id using the second payment
 *    method’s code and assert that the call fails (generic error assertion
 *    only, without inspecting HTTP status).
 */
export async function test_api_admin_payment_method_surcharge_read_scoped_to_correct_payment_method(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create two distinct payment methods
  const firstMethodCode = `card_gateway_${RandomGenerator.alphaNumeric(6)}`;
  const secondMethodCode = `bank_transfer_${RandomGenerator.alphaNumeric(6)}`;

  const firstMethodBody = {
    code: firstMethodCode,
    display_name: "Card Gateway KR",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: firstMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(firstMethod);
  TestValidator.equals(
    "first payment method code should match payload",
    firstMethod.code,
    firstMethodCode,
  );

  const secondMethodBody = {
    code: secondMethodCode,
    display_name: "Bank Transfer KR",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: "bank_gateway",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 500,
    max_amount: 500000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: secondMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(secondMethod);
  TestValidator.equals(
    "second payment method code should match payload",
    secondMethod.code,
    secondMethodCode,
  );

  // 3. Create a surcharge for the first payment method only
  const surchargeCreateBody = {
    scope_code: "default_scope",
    currency_code: "KRW",
    min_order_amount: 1000,
    max_order_amount: 100000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const createdSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: firstMethodCode,
        body: surchargeCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(createdSurcharge);
  TestValidator.equals(
    "created surcharge should belong to first payment method (summary code)",
    createdSurcharge.paymentMethod.code,
    firstMethodCode,
  );

  // 4. Positive control: read surcharge via correct payment method
  const fetchedSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.at(
      connection,
      {
        paymentMethodCode: firstMethodCode,
        surchargeId: createdSurcharge.id,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(fetchedSurcharge);

  TestValidator.equals(
    "fetched surcharge id equals created surcharge id",
    fetchedSurcharge.id,
    createdSurcharge.id,
  );
  TestValidator.equals(
    "fetched surcharge payment method remains bound to first method",
    fetchedSurcharge.paymentMethod.code,
    firstMethodCode,
  );

  // 5. Negative case: attempt cross-method read using second payment method code
  await TestValidator.error(
    "cross-method surcharge read should fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.at(
        connection,
        {
          paymentMethodCode: secondMethodCode,
          surchargeId: createdSurcharge.id,
        },
      );
    },
  );
}
