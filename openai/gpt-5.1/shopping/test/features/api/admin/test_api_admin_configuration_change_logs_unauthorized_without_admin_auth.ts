import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallAdminConfigurationChangeLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminConfigurationChangeLog";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that admin configuration change logs search is rejected when called
 * without platform admin authentication.
 *
 * Business goal: Admin configuration change logs contain sensitive audit
 * information about platform-level settings. Only authenticated platform
 * administrators should be able to query this endpoint. This test ensures that
 * when the endpoint is invoked without an Authorization header, the request
 * fails instead of returning audit data.
 *
 * Test strategy:
 *
 * 1. Use the existing platformAdmin join endpoint only to validate that auth
 *    normally exists, but do not reuse its token for the negative case.
 * 2. Build a well-typed IShoppingMallAdminConfigurationChangeLog.IRequest body
 *    with simple, valid pagination and filter fields.
 * 3. Derive an unauthenticated connection object from the provided connection by
 *    shallow-cloning and replacing headers with an empty object, without
 *    touching the original connection.headers.
 * 4. Call
 *    api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index
 *    with the unauthenticated connection and the request body.
 * 5. Use TestValidator.error to assert that an error is thrown for the
 *    unauthenticated request, without asserting concrete status codes or
 *    response shapes.
 * 6. Never perform typia.assert on the unauthorized response, because the call
 *    must fail.
 */
export async function test_api_admin_configuration_change_logs_unauthorized_without_admin_auth(
  connection: api.IConnection,
) {
  // 1. (Optional sanity) Ensure platformAdmin join works once so that audit
  //    log search being protected is meaningful in the environment.
  //    We call join but do not use its token for the negative test path.
  const _joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<IShoppingMallPlatformAdminJoin.IRequest>(),
    });
  typia.assert(_joinedAdmin);

  // 2. Build a well-formed search request for configuration change logs.
  const requestBody = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallAdminConfigurationChangeLog.IRequest;

  // 3. Create an unauthenticated connection by shallow cloning and providing
  //    an empty headers object. Do not mutate the original connection.headers
  //    because the SDK owns header management.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4 & 5. Attempt to call the admin configuration change logs search
  //        without any Authorization header, and assert that it results in
  //        an error (authentication/authorization failure) without checking
  //        specific status codes.
  await TestValidator.error(
    "admin configuration change logs require authentication",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminConfigurationChangeLogs.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
