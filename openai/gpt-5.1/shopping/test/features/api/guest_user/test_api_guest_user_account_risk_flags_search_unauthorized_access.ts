import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that guest user account risk flag search rejects anonymous access.
 *
 * Business intent: This test ensures that the admin-only endpoint for searching
 * account risk flags of a specific guest user: PATCH
 * /shoppingMall/admin/guestUsers/{guestUserId}/accountRiskFlags is not
 * accessible when no Authorization header is present. The endpoint is designed
 * strictly for administrator use and must not leak any risk information to
 * anonymous callers.
 *
 * High-level steps:
 *
 * 1. Satisfy the admin join dependency by creating an administrator via POST
 *    /auth/admin/join. This ensures the platform has at least one admin
 *    account, but we do not use this admin token for the unauthorized call.
 * 2. Derive an "anonymous" connection object from the injected connection by
 *    shallow cloning it and providing an empty headers object. This simulates a
 *    client with no Authorization header set.
 * 3. Construct a syntactically valid IShoppingMallAccountRiskFlag.IRequest body
 *    using typia.random<...>(), ensuring all fields are type-correct while not
 *    relying on any particular data semantics.
 * 4. Invoke api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index
 *    with the anonymous connection, a random guestUserId value, and the valid
 *    request body, wrapped inside TestValidator.error to assert that an error
 *    is thrown for unauthorized access.
 * 5. Do not assert specific status codes (401 vs 403) or error structure; only
 *    verify that the request fails and therefore cannot return any risk flag
 *    data to an unauthenticated caller.
 */
export async function test_api_guest_user_account_risk_flags_search_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Satisfy dependency: create an admin via /auth/admin/join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare an anonymous connection without Authorization header
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Build a valid risk flag search request body
  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    order_by: "created_at",
    order_direction: "desc",
    actor_type: "guestuser",
    severity: "high",
    active: true,
    code: "SUSPICIOUS_LOGIN_PATTERN",
    created_from: typia.random<string & tags.Format<"date-time">>(),
    created_to: typia.random<string & tags.Format<"date-time">>(),
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const guestUserId = typia.random<string>();

  // 4. Call the admin-only endpoint with anonymous connection and expect error
  await TestValidator.error(
    "guest user risk flag search must reject anonymous access",
    async () => {
      await api.functional.shoppingMall.admin.guestUsers.accountRiskFlags.index(
        anonymousConnection,
        {
          guestUserId,
          body: requestBody,
        },
      );
    },
  );
}
