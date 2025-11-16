import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";
import type { IShoppingMallSecurityEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEventMetadata";
import type { IShoppingMallSecurityEventMetadataValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEventMetadataValue";

/**
 * Validate that accessing a single security event by ID without any
 * authentication token is rejected.
 *
 * Business purpose:
 *
 * - Security event detail APIs are strictly admin-only because they expose
 *   sensitive forensic and risk data.
 * - An unauthenticated caller must never successfully retrieve an
 *   IShoppingMallSecurityEvent record.
 *
 * Test steps:
 *
 * 1. Clone the provided connection into an unauthenticated connection with empty
 *    headers, so there is no Authorization token.
 * 2. Generate a random UUID as a dummy securityEventId path parameter.
 * 3. Call GET /shoppingMall/platformAdmin/securityEvents/{securityEventId} using
 *    the unauthenticated connection.
 * 4. Verify that the call fails with an HTTP error (4xx).
 * 5. Ensure that no IShoppingMallSecurityEvent object is observed, since the SDK
 *    throws an HttpError instead of returning data on failure.
 */
export async function test_api_security_event_get_by_id_unauthorized_without_token(
  connection: api.IConnection,
) {
  // 1. Build an unauthenticated connection with empty headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 2. Prepare a random UUID for the securityEventId path parameter
  const securityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3~4. Invoke the admin-only endpoint without token and expect an HTTP error
  await TestValidator.httpError(
    "unauthenticated access to security event detail should fail",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.platformAdmin.securityEvents.at(
        unauthConnection,
        {
          securityEventId,
        },
      );
    },
  );
}
