import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomerCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure that unauthenticated callers cannot inspect customer credential views.
 *
 * Business intent: The endpoint GET
 * /shoppingMall/platformAdmin/customers/{customerId}/credentials is reserved
 * strictly for platform administrators. It must not expose any credential state
 * to unauthenticated clients or non-admin actors.
 *
 * This test validates that when the endpoint is called without any
 * Authorization header, the request fails rather than returning an
 * IShoppingMallCustomerCredential payload.
 *
 * Scenario steps:
 *
 * 1. Generate a random UUID value for `customerId`. We do not depend on the
 *    customer actually existing because the focus is on authentication, not
 *    resource presence.
 * 2. Construct an "unauthenticated" connection object by shallow-cloning the
 *    provided `connection` and overriding `headers` with an empty object. This
 *    avoids mutating the shared connection.headers but guarantees that no
 *    Authorization header is sent.
 * 3. Invoke the credentials inspection endpoint with the unauthenticated
 *    connection and random customerId inside `TestValidator.error`, asserting
 *    that the call fails (throws) for lack of admin authentication.
 * 4. The test does not inspect the specific HTTP status code or error payload,
 *    only that an error condition occurs, which is sufficient to validate that
 *    the endpoint is not accessible without auth.
 */
export async function test_api_platform_admin_forbidden_to_view_customer_credentials_without_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a random customer identifier (UUID format) for the request.
  const customerId = typia.random<string & tags.Format<"uuid">>();

  // 2. Create an unauthenticated connection by cloning the base connection
  //    but clearing headers so that no Authorization token is attached.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Verify that calling the protected credentials endpoint without any
  //    Authorization header results in an error. We don't assert the exact
  //    HTTP status code; we just ensure an error is thrown and that no
  //    credential payload is returned to an unauthenticated caller.
  await TestValidator.error(
    "platform admin credential view must be forbidden without authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.credentials.at(
        unauthenticated,
        {
          customerId,
        },
      );
    },
  );
}
