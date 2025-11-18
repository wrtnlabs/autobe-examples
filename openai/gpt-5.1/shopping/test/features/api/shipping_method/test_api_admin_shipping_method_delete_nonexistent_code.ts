import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate deletion behavior when an admin tries to delete a non-existent
 * shipping method.
 *
 * Business goals:
 *
 * - Ensure DELETE /shoppingMall/admin/shippingMethods/{methodCode} does not
 *   silently succeed when the target methodCode does not exist.
 * - Ensure the endpoint still requires valid admin authentication even when the
 *   target resource is missing.
 *
 * Steps:
 *
 * 1. Join as an admin via POST /auth/admin/join.
 * 2. Using the authenticated connection, call erase with a clearly non-existent
 *    methodCode and expect an HTTP client error (4xx) via
 *    TestValidator.httpError.
 * 3. Clone the connection to an unauthenticated version and call erase again with
 *    the same methodCode, expecting an authorization-related HTTP error.
 */
export async function test_api_admin_shipping_method_delete_nonexistent_code(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain an authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Attempt to delete a non-existent shipping method as authenticated admin
  const nonexistentMethodCode = `nonexistent-delete-test-${RandomGenerator.alphaNumeric(16)}`;

  await TestValidator.httpError(
    "authenticated admin deleting non-existent shipping method should result in client error",
    [400, 404, 409, 422],
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.erase(
        connection,
        {
          methodCode: nonexistentMethodCode,
        },
      );
    },
  );

  // 3. Prepare an unauthenticated connection by cloning and providing empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Attempt to delete with an unauthenticated connection, expecting auth error
  await TestValidator.httpError(
    "unauthenticated caller should not be able to delete shipping methods",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.shippingMethods.erase(
        unauthenticatedConnection,
        {
          methodCode: nonexistentMethodCode,
        },
      );
    },
  );
}
