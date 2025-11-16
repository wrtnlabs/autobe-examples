import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminOpsOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOpsOverview";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that the admin operations overview dashboard requires platformAdmin
 * authorization.
 *
 * Business context: The /shoppingMall/platformAdmin/dashboard/adminOpsOverview
 * endpoint aggregates sensitive operational metrics (orders, after-sales
 * issues, refunds, seller performance, and recent admin activities). It must
 * only be accessible to authenticated platform administrators. Unauthenticated
 * callers must not be able to retrieve this data.
 *
 * Test steps:
 *
 * 1. Bootstrap a new platformAdmin account using POST /auth/platformAdmin/join.
 *
 *    - Use typia.random<IShoppingMallPlatformAdminJoin.IRequest>() to build a valid
 *         join request payload.
 *    - Verify the join response conforms to IShoppingMallPlatformAdmin.IAuthorized.
 *    - The SDK will automatically attach the access token to connection.headers.
 * 2. With the authenticated platformAdmin connection, call GET
 *    /shoppingMall/platformAdmin/dashboard/adminOpsOverview.
 *
 *    - Verify the response conforms to IShoppingMallAdminOpsOverview using
 *         typia.assert, ensuring type-level integrity of the aggregated
 *         metrics.
 * 3. Create an unauthenticated connection clone without any headers.
 *
 *    - Clone all properties from the original `connection` but explicitly set
 *         headers: {} on the clone.
 *    - This simulates a caller with no Authorization header, without touching the
 *         original connection.headers (which the SDK controls).
 * 4. Using the unauthenticated connection, attempt to call adminOpsOverview.at
 *    again.
 *
 *    - Use TestValidator.error with an async callback to assert that the call fails
 *         and throws an error.
 *    - Per E2E guidelines, do not assert specific HTTP status codes or error payload
 *         structure; only the fact that an error occurs is validated.
 */
export async function test_api_platform_admin_ops_overview_authorization_required(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform admin
  const joinRequest = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();

  const authorizedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(authorizedAdmin);

  // 2. Authenticated platform admin should successfully fetch adminOpsOverview
  const overview: IShoppingMallAdminOpsOverview =
    await api.functional.shoppingMall.platformAdmin.dashboard.adminOpsOverview.at(
      connection,
    );
  typia.assert<IShoppingMallAdminOpsOverview>(overview);

  // 3. Build an unauthenticated connection clone (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  // 4. Unauthenticated caller must not be able to fetch adminOpsOverview
  await TestValidator.error(
    "unauthenticated adminOpsOverview access should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.dashboard.adminOpsOverview.at(
        unauthenticatedConnection,
      );
    },
  );
}
