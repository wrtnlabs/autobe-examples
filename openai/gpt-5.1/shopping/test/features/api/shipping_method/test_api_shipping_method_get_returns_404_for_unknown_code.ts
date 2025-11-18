import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

/**
 * Verify that fetching a shipping method with an unknown methodCode results in
 * an HTTP error (e.g., 404) while valid operations still work.
 *
 * Business intent
 *
 * - The public GET /shoppingMall/shippingMethods/{methodCode} endpoint should
 *   return a not-found style error when the given methodCode does not exist in
 *   shopping_mall_shipping_methods.
 * - The error must not leak internal implementation details like raw SQL or stack
 *   traces.
 * - A failed lookup must not corrupt state; subsequent valid calls should behave
 *   normally.
 *
 * Test flow
 *
 * 1. Bootstrap an admin account via POST /auth/admin/join so that we can seed at
 *    least one real shipping method using the admin endpoint.
 * 2. As the newly joined admin, create a valid shipping method by calling POST
 *    /shoppingMall/admin/shippingMethods with a simple configuration.
 * 3. Call GET /shoppingMall/shippingMethods/{methodCode} using a long, random
 *    methodCode that is extremely unlikely to collide with any existing
 *    method_code.
 * 4. Confirm that the GET call fails with an HTTP error (client side) by using
 *    TestValidator.error. We only assert that an error occurs, not its exact
 *    HTTP status code or message body, to stay within the framework rules.
 * 5. Immediately call GET again with the known, valid method_code created in step
 *    2 and verify that:
 *
 *    - The call succeeds.
 *    - The returned payload matches IShoppingMallShippingMethod via typia.assert.
 *
 * Notes
 *
 * - We do not inspect HTTP status codes or error payload details explicitly, in
 *   accordance with the constraints that forbid status code assertions and
 *   fine‑grained error body checks.
 * - We avoid any manipulation of connection.headers, relying entirely on the
 *   SDK’s automatic Authorization header management performed by the admin join
 *   function.
 */
export async function test_api_shipping_method_get_returns_404_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authorization context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seed a valid shipping method using the admin endpoint.
  const createBody = {
    method_code: `standard-${RandomGenerator.alphaNumeric(16)}`,
    display_name: `Standard Shipping ${RandomGenerator.name(1)}`,
    service_level_description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallShippingMethod.ICreate;

  const createdMethod: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.admin.shippingMethods.create(connection, {
      body: createBody,
    });
  typia.assert(createdMethod);

  // 3. Prepare an extremely unlikely methodCode to simulate "unknown".
  const unknownMethodCode = `unknown-${RandomGenerator.alphaNumeric(64)}`;

  // 4. Calling GET with an unknown methodCode must result in an error.
  await TestValidator.error(
    "unknown shipping method must cause error",
    async () => {
      await api.functional.shoppingMall.shippingMethods.at(connection, {
        methodCode: unknownMethodCode,
      });
    },
  );

  // 5. Ensure that a subsequent GET with the known valid method_code works.
  const reloaded: IShoppingMallShippingMethod =
    await api.functional.shoppingMall.shippingMethods.at(connection, {
      methodCode: createdMethod.method_code,
    });
  typia.assert(reloaded);

  TestValidator.equals(
    "valid method remains accessible after not-found error",
    reloaded.method_code,
    createdMethod.method_code,
  );

  TestValidator.equals(
    "display name is preserved",
    reloaded.display_name,
    createdMethod.display_name,
  );
}
