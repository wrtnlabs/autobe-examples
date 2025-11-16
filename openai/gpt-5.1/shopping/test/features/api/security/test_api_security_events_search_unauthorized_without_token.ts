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
 * Verify that platform admin security event search cannot be accessed without
 * authentication.
 *
 * Business purpose:
 *
 * - The security events log is highly sensitive and must only be visible to
 *   authenticated platform administrators.
 * - Any attempt to search security events without a valid admin session must be
 *   rejected, ensuring no security metadata is leaked.
 *
 * Scenario:
 *
 * 1. Prepare a valid minimal search request body for PATCH
 *    /shoppingMall/platformAdmin/securityEvents.
 * 2. Create a new connection instance that has an empty headers object, ensuring
 *    no Authorization token is present.
 * 3. Call the security events search endpoint with this unauthenticated connection
 *    and expect the call to fail.
 * 4. Validate via TestValidator.error that the platform rejects the request,
 *    without asserting specific HTTP status codes.
 */
export async function test_api_security_events_search_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Build a minimal, valid search request body for security events.
  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  // 2. Derive an unauthenticated connection: same host/options, but
  //    with a fresh, empty headers object so that no Authorization
  //    header is sent. After creation, we must not touch headers again.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to search security events without any Authorization
  //    token. The platform admin-only endpoint must reject this.
  await TestValidator.error(
    "security events search without token must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.securityEvents.index(
        unauthConn,
        {
          body: requestBody,
        },
      );
    },
  );
}
