import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";

/**
 * Verify that requesting admin payment method detail with an unknown code
 * results in an error instead of returning a successful payment method
 * configuration.
 *
 * ## Business context
 *
 * The shopping mall platform exposes an admin-only endpoint to retrieve payment
 * method configuration records from the `shopping_mall_payment_methods` table
 * using a business-facing code (for example `"card"`, `"bank_transfer"`, etc.).
 * This test ensures that when an administrator requests details for a code that
 * does not exist, the system responds with a failure (SDK throws an error)
 * rather than incorrectly returning a IShoppingMallPaymentMethod object or
 * silently succeeding.
 *
 * ## Test workflow
 *
 * 1. Register a new admin using POST /auth/admin/join via
 *    `api.functional.auth.admin.join`.
 *
 *    - Use `typia.random<IShoppingMallAdminJoin.ICreate>()` to generate a valid join
 *         payload.
 *    - Validate the response as `IShoppingMallAdmin.IAuthorized` with
 *         `typia.assert`.
 *    - This step also configures `connection.headers.Authorization` with the admin's
 *         access token through the SDK side effect.
 * 2. Construct a payment method code that is extremely unlikely to exist.
 *
 *    - Use a deterministic prefix such as `"__e2e_unknown_payment_method__"`
 *         combined with a random alphanumeric suffix from
 *         `RandomGenerator.alphaNumeric()` to avoid collisions with any normal
 *         business codes.
 * 3. Call GET /shoppingMall/admin/paymentMethods/{paymentMethodCode} using
 *    `api.functional.shoppingMall.admin.paymentMethods.at` with the unknown
 *    code.
 *
 *    - Wrap the call in `TestValidator.error` with an async closure and `await` it
 *         so that we assert the call fails instead of returning an
 *         `IShoppingMallPaymentMethod`.
 * 4. Do not perform any positive-path validation of existing payment methods
 *    because no create/list API is available in the provided materials. This
 *    test is strictly focused on the "unknown code" error behavior.
 *
 * ## Validation rules
 *
 * - Admin join must succeed and yield a valid `IShoppingMallAdmin.IAuthorized`
 *   payload.
 * - Fetching a payment method by an unknown code must cause the SDK to throw an
 *   error (network/HTTP error), which `TestValidator.error` will treat as
 *   expected failure.
 * - The test must not accidentally let a successful `at()` call pass without
 *   error when using a clearly unknown paymentMethodCode.
 */
export async function test_api_admin_payment_method_detail_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register an admin and validate the authorization payload.
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Build a clearly non-existent payment method code.
  const unknownCodePrefix = "__e2e_unknown_payment_method__";
  const unknownCodeSuffix = RandomGenerator.alphaNumeric(16);
  const unknownPaymentMethodCode = `${unknownCodePrefix}${unknownCodeSuffix}`;

  // 3. Assert that fetching details for the unknown code fails with an error.
  await TestValidator.error(
    "unknown payment method code must fail",
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.at(connection, {
        paymentMethodCode: unknownPaymentMethodCode,
      });
    },
  );
}
