import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that platform admin error log detail endpoint rejects unauthenticated
 * access.
 *
 * Business goal: Ensure that GET
 * /shoppingMall/platformAdmin/errorLogs/{errorLogId} cannot be used by
 * unauthenticated callers to retrieve sensitive diagnostic information. Only
 * authenticated platform administrators should be able to access the detailed
 * error log records.
 *
 * Test strategy:
 *
 * 1. Perform a platformAdmin join on the main connection to establish a correctly
 *    authenticated admin session and to confirm that the endpoint itself works
 *    under proper authorization.
 * 2. Using that authenticated connection, attempt a happy-path call to the error
 *    log detail endpoint with a syntactically valid UUID and assert the
 *    response structure via typia.assert. This is a sanity check.
 * 3. Construct a new connection object that has the same host and other properties
 *    as the original connection but with an explicit empty headers object. This
 *    connection represents an unauthenticated caller because no auth APIs have
 *    been invoked on it and it has no Authorization header.
 * 4. Call the error log detail endpoint with this unauthenticated connection and
 *    assert, using TestValidator.error, that the call fails instead of
 *    returning an IShoppingMallErrorLog.
 *
 * Notes:
 *
 * - We do not explicitly check HTTP status codes or error bodies; any thrown
 *   error is interpreted as a sign that unauthenticated access is not
 *   permitted.
 * - We do not attempt a non-admin actor scenario because only the platformAdmin
 *   join API is exposed in the provided SDK slice.
 */
export async function test_api_platform_admin_error_log_detail_unauthorized(
  connection: api.IConnection,
) {
  // Step 1: Prepare a random, syntactically valid UUID for the error log ID
  const errorLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Join as a platform administrator on the main connection
  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Step 3: Sanity-check call: authenticated access to error log detail
  const authenticatedLog: IShoppingMallErrorLog =
    await api.functional.shoppingMall.platformAdmin.errorLogs.at(connection, {
      errorLogId,
    });
  typia.assert<IShoppingMallErrorLog>(authenticatedLog);

  // Step 4: Build an unauthenticated connection clone with empty headers
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
    headers: {},
  };

  // Step 5: Attempt to access error log detail without authentication
  await TestValidator.error(
    "unauthenticated error log detail access must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.errorLogs.at(
        unauthenticatedConnection,
        {
          errorLogId,
        },
      );
    },
  );
}
