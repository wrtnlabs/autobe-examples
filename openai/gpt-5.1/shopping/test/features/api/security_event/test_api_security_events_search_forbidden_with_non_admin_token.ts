import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

/**
 * Validate that non-admin (unauthenticated) callers cannot access the
 * platform-admin security events search endpoint.
 *
 * Business context:
 *
 * - Platform administrators use PATCH /shoppingMall/platformAdmin/securityEvents
 *   to query sensitive security events stored in
 *   shopping_mall_security_events.
 * - Other actors (or anonymous clients) must not be able to access this endpoint,
 *   enforcing strict role-based access control and preventing privilege
 *   escalation via token reuse.
 *
 * Test steps:
 *
 * 1. Join a platformAdmin via POST /auth/platformAdmin/join to establish that a
 *    valid admin token can exist on the primary connection (and to exercise the
 *    dependency endpoint).
 * 2. Build a valid IShoppingMallSecurityEvent.IRequest body (simple pagination
 *    filter) so that any failure is due to authorization, not validation.
 * 3. Create a separate connection object that copies host/options/simulate but
 *    uses an empty headers object, representing an unauthenticated caller.
 * 4. Call api.functional.shoppingMall.platformAdmin.securityEvents.index with the
 *    unauthenticated connection and the valid request body.
 * 5. Use TestValidator.error to assert that the call results in an error,
 *    indicating forbidden access for non-platformAdmin actors, without
 *    asserting a specific HTTP status code.
 */
export async function test_api_security_events_search_forbidden_with_non_admin_token(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to ensure admin tokens exist in the system.
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert(admin);

  // 2. Prepare a valid security events search request body.
  const searchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  // 3. Create an unauthenticated connection (no Authorization header).
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4 & 5. Ensure that calling the endpoint without platformAdmin token fails.
  await TestValidator.error(
    "non-admin (unauthenticated) access must be rejected",
    async () => {
      await api.functional.shoppingMall.platformAdmin.securityEvents.index(
        unauthenticated,
        {
          body: searchRequest,
        },
      );
    },
  );
}
