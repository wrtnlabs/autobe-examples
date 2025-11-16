import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallErrorLog";
import type { IShoppingMallErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallErrorLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure unauthenticated callers cannot access platform admin error logs index.
 *
 * Business context: The `/shoppingMall/platformAdmin/errorLogs` endpoint
 * exposes sensitive observability data about internal failures in the shopping
 * mall backend. By contract, it is restricted to `platformAdmin` actors only.
 * Any caller without a valid platform admin authorization must be rejected by
 * the backend. This test validates that behavior for completely unauthenticated
 * access.
 *
 * Scope decisions:
 *
 * - We only validate the unauthenticated case here. The original textual scenario
 *   also mentioned testing a non-admin actor (e.g., customer or seller), but no
 *   such authentication APIs are provided in the current materials, so that
 *   part is not implementable and is intentionally omitted.
 * - We do not inspect specific HTTP status codes or error payloads; we only
 *   assert that the API call fails, which is the supported pattern with
 *   TestValidator.error.
 *
 * Steps:
 *
 * 1. Derive an unauthenticated connection from the provided `connection` by
 *    cloning it and setting its `headers` to an empty object. Per rules, we do
 *    this only at construction time and never touch `headers` afterward.
 * 2. Build a minimal, valid `IShoppingMallErrorLog.IRequest` body. All fields are
 *    optional filters, so an empty object `{}` is acceptable and will rely on
 *    backend defaults for pagination and time window.
 * 3. Call `api.functional.shoppingMall.platformAdmin.errorLogs.index` with the
 *    unauthenticated connection and body inside `TestValidator.error`,
 *    asserting that an error is thrown because the caller lacks platformAdmin
 *    authorization.
 */
export async function test_api_platform_admin_error_logs_index_unauthorized_access_rejected(
  connection: api.IConnection,
) {
  // 1. Create an unauthenticated connection by clearing headers at creation time.
  //    After this line, we must not mutate `unauthConn.headers` again.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 2. Prepare a minimal, valid search request body.
  const requestBody = {} satisfies IShoppingMallErrorLog.IRequest;

  // 3. Ensure that calling the admin error logs index endpoint without
  //    any Authorization header results in an error.
  await TestValidator.error(
    "unauthenticated access to platform admin error logs must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.errorLogs.index(
        unauthConn,
        {
          body: requestBody,
        },
      );
    },
  );
}
