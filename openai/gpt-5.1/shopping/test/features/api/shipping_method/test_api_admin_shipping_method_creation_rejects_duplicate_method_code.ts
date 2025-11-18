import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Ensure admin shipping method creation rejects duplicate method_code.
 *
 * Business rule: shipping methods are business-level configurations identified
 * by a stable method_code (like "standard" or "express"). The backend must
 * enforce a unique constraint on IShoppingMallShippingMethod.method_code so
 * that an admin cannot accidentally create conflicting definitions with the
 * same code.
 *
 * This E2E test covers the happy-path creation and the duplicate-rejection
 * behavior in a single authenticated admin flow:
 *
 * 1. Register a new admin via POST /auth/admin/join
 *
 *    - Build an IShoppingMallAdminJoin.ICreate body with random but type-correct
 *         values for email, password, href, and referrer.
 *    - Call api.functional.auth.admin.join(connection, { body }) to obtain
 *         IShoppingMallAdmin.IAuthorized, and typia.assert the response.
 *    - The SDK automatically attaches the admin access token to the connection
 *         headers, so subsequent calls use admin auth.
 * 2. Create an initial shipping method via POST
 *    /shoppingMall/admin/shippingMethods
 *
 *    - Choose a fixed method_code (for example, "standard_shipping").
 *    - Build an IShoppingMallShippingMethod.ICreate body with that method_code, a
 *         clear display_name, and an optional service_level_description
 *         string.
 *    - Call api.functional.shoppingMall.admin.shippingMethods.create with the admin
 *         connection and typia.assert the IShoppingMallShippingMethod
 *         response.
 *    - Use TestValidator.equals to confirm that method_code and display_name in the
 *         response echo the input body, validating the happy path.
 * 3. Attempt to create a duplicate shipping method with the same method_code
 *
 *    - Build a second IShoppingMallShippingMethod.ICreate body that reuses the same
 *         method_code but can change display_name or description.
 *    - Wrap a second create call in TestValidator.httpError, expecting a 400 or
 *         409-style client error, to confirm the unique constraint is enforced
 *         at the business level.
 * 4. Sanity re-check
 *
 *    - Re-assert in-memory that the first-created record’s method_code and
 *         display_name remain the expected values, reinforcing that the
 *         duplicate attempt did not affect the successful record.
 */
export async function test_api_admin_shipping_method_creation_rejects_duplicate_method_code(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. First successful shipping method creation
  const methodCode = "standard_shipping";
  const createBody1 = {
    method_code: methodCode,
    display_name: "Standard Shipping",
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const firstCreated =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody1,
    });
  typia.assert<IShoppingMallShippingMethod>(firstCreated);

  TestValidator.equals(
    "first creation: method_code should match input",
    firstCreated.method_code,
    methodCode,
  );
  TestValidator.equals(
    "first creation: display_name should match input",
    firstCreated.display_name,
    createBody1.display_name,
  );

  // 3. Attempt duplicate creation with same method_code
  const createBody2 = {
    method_code: methodCode,
    display_name: "Standard Shipping Duplicate",
    service_level_description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  await TestValidator.httpError(
    "duplicate shipping method_code must be rejected",
    [400, 409],
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.create(
        connection,
        {
          body: createBody2,
        },
      );
    },
  );

  // 4. Sanity check of first-created record in memory
  TestValidator.equals(
    "first-created method_code remains unchanged in memory",
    firstCreated.method_code,
    methodCode,
  );
  TestValidator.equals(
    "first-created display_name remains unchanged in memory",
    firstCreated.display_name,
    createBody1.display_name,
  );
}
