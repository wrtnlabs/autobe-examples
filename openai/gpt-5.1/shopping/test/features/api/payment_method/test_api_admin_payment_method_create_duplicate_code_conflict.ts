import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Validate that admin payment method creation enforces unique business code.
 *
 * Business goal: Ensure that the admin configuration API for payment methods
 * respects the unique index on `shopping_mall_payment_methods.code`. When an
 * admin attempts to create a payment method with a code that already exists,
 * the second creation must fail, preventing duplicate configurations for the
 * same logical payment method.
 *
 * Test flow:
 *
 * 1. Register a new shopping mall admin using POST /auth/admin/join.
 *
 *    - Build a valid IShoppingMallAdminJoin.ICreate payload including email,
 *         password, href, and referrer.
 *    - Call api.functional.auth.admin.join(connection, { body }).
 *    - Confirm that an IShoppingMallAdmin.IAuthorized payload is returned and
 *         validated via typia.assert, and rely on the SDK to attach the
 *         Authorization header to the connection.
 * 2. As this authenticated admin, create a payment method with a specific business
 *    code using POST /shoppingMall/admin/paymentMethods.
 *
 *    - Construct an IShoppingMallPaymentMethod.ICreate body with:
 *
 *         - Code: a stable test code string such as "card_gateway_kr".
 *         - Display_name: some human readable text.
 *         - Provider_type: some provider family like "card_processor".
 *         - Status: "active".
 *         - Optionally set description, allowed_currencies, allowed_countries,
 *                   min_amount, and max_amount to realistic values or null.
 *    - Call api.functional.shoppingMall.admin.paymentMethods.create(connection, {
 *         body }).
 *    - Assert the response with typia.assert and verify basic invariants like the
 *         returned code equals the requested code using TestValidator.equals.
 * 3. Attempt to create a second payment method with the same code.
 *
 *    - Build another IShoppingMallPaymentMethod.ICreate body reusing the same `code`
 *         value but changing non-unique fields such as display_name or
 *         description to ensure the only conflict is on the unique code.
 *    - Use TestValidator.error with an async callback to wrap a second call to
 *         api.functional.shoppingMall.admin.paymentMethods.create using this
 *         duplicate body.
 *    - This asserts that the second creation attempt fails (due to the unique index
 *         on code), without asserting any specific HTTP status code.
 * 4. Post-conditions / sanity checks.
 *
 *    - Confirm again via TestValidator.equals that the initially created payment
 *         method retains its original code value, demonstrating that the failed
 *         duplicate attempt did not modify the existing record.
 *    - No listing endpoint is required; type assertions and invariants on the first
 *         created record are sufficient to prove only one configuration with
 *         that code exists from the test perspective.
 */
export async function test_api_admin_payment_method_create_duplicate_code_conflict(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const joinBody = {
    email: `${RandomGenerator.alphabets(12)}@example.com`,
    password: "Adm1n_Passw0rd!", // strong enough to satisfy password format
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create initial payment method with a unique business code
  const code = "card_gateway_kr";

  const firstPaymentMethodBody = {
    code,
    display_name: "Korean Card Gateway",
    description: "Primary card processor for KR market",
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR",
    min_amount: 1000,
    max_amount: 10000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: firstPaymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(firstPaymentMethod);

  TestValidator.equals(
    "created payment method code matches request code",
    firstPaymentMethod.code,
    code,
  );

  // 3. Attempt to create a second payment method with the same code
  const duplicatePaymentMethodBody = {
    code, // same code to trigger unique index violation
    display_name: "Korean Card Gateway (Duplicate)",
    description: "Duplicate configuration that should be rejected",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 500,
    max_amount: 5000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  await TestValidator.error(
    "duplicate payment method code creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.create(
        connection,
        {
          body: duplicatePaymentMethodBody,
        },
      );
    },
  );

  // 4. Sanity check: the original payment method's code remains unchanged
  TestValidator.equals(
    "original payment method code remains unchanged after duplicate attempt",
    firstPaymentMethod.code,
    code,
  );
}
