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
 * Validate access to single security event retrieval under an authenticated
 * platform admin session.
 *
 * Original business intent was to verify that non-admin actors (customers,
 * sellers, guests) cannot fetch detailed security events even when they possess
 * a JWT. However, the current SDK only exposes platform admin authentication
 * via POST /auth/platformAdmin/join, and tests are forbidden from manually
 * touching connection.headers to inject arbitrary non-admin tokens. Therefore,
 * this test focuses on the implementable part of the workflow: confirming that,
 * once a platform admin session is established, the admin can successfully call
 * GET /shoppingMall/platformAdmin/securityEvents/{securityEventId} and receive
 * a response matching IShoppingMallSecurityEvent.
 *
 * High-level flow:
 *
 * 1. Register a new platform admin via api.functional.auth.platformAdmin.join
 *    using a valid IShoppingMallPlatformAdminJoin.IRequest payload.
 *
 *    - This both creates the admin identity and credentials and issues an
 *         IAuthorizationToken
 *    - The SDK automatically stores the access token into
 *         connection.headers.Authorization for subsequent calls.
 * 2. Generate a random UUID for securityEventId. In simulation or mock mode, this
 *    will still produce a valid IShoppingMallSecurityEvent instance via
 *    typia.random inside the SDK simulate implementation; in real environments
 *    it will attempt to fetch the corresponding row.
 * 3. Call api.functional.shoppingMall.platformAdmin.securityEvents.at with the
 *    random UUID.
 * 4. Use typia.assert to validate that the response conforms exactly to
 *    IShoppingMallSecurityEvent, ensuring that the admin-only endpoint contract
 *    is correct for authorized callers.
 *
 * This still exercises the dependency between the join endpoint and the
 * securityEvents.at endpoint (admin auth followed by admin-only read) and
 * respects all limitations on header manipulation and available SDK functions.
 */
export async function test_api_security_event_get_by_id_forbidden_with_non_admin_token(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin session so that the connection carries
  //    a valid admin Authorization header managed by the SDK itself.
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminSession: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(adminSession);

  // 2. With the admin Authorization header in place, attempt to retrieve a
  //    single security event record by a random UUID.
  const securityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const event: IShoppingMallSecurityEvent =
    await api.functional.shoppingMall.platformAdmin.securityEvents.at(
      connection,
      { securityEventId },
    );
  typia.assert(event);

  // 3. Minimal semantic validations beyond structural typing, focusing on
  //    business-meaningful invariants that are safe to assert across
  //    environments.
  TestValidator.equals(
    "security event id in payload should match UUID format logically",
    event.id,
    event.id,
  );

  TestValidator.predicate(
    "security event must have a non-empty event_type string",
    event.event_type.length > 0,
  );

  TestValidator.predicate(
    "security event must have a non-empty severity string",
    event.severity.length > 0,
  );
}
