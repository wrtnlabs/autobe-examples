import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

/**
 * Test guest registration with and without optional IP address field handling
 *
 * Validates that the system properly handles both scenarios:
 *
 * - When IP address is provided for SSR scenarios
 * - When IP address is omitted for regular client requests
 *
 * The test should verify:
 *
 * 1. Guest sessions are created successfully in both cases
 * 2. IP field validation works correctly when provided
 * 3. Optional IP field accepts null, undefined, or valid values
 * 4. Token authorization is properly set after registration
 */
export async function test_api_auth_guest_join_ip_address_optional_handling(
  connection: api.IConnection,
) {
  // Test 1: Guest registration with valid IP address (SSR scenario)
  const guestWithIp = await api.functional.auth.guest.join(connection, {
    body: {
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.ICreate,
  });
  typia.assert(guestWithIp);
  TestValidator.predicate(
    "guest with IP has valid ID",
    guestWithIp.id.length > 0,
  );
  TestValidator.predicate(
    "guest with IP has session identifier",
    guestWithIp.session_identifier.length > 0,
  );
  TestValidator.predicate(
    "guest with IP has token",
    guestWithIp.token.access.length > 0,
  );

  // Test 2: Guest registration without IP address (client scenario)
  const guestWithoutIp = await api.functional.auth.guest.join(connection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.ICreate,
  });
  typia.assert(guestWithoutIp);
  TestValidator.predicate(
    "guest without IP has valid ID",
    guestWithoutIp.id.length > 0,
  );
  TestValidator.predicate(
    "guest without IP has session identifier",
    guestWithoutIp.session_identifier.length > 0,
  );
  TestValidator.predicate(
    "guest without IP has token",
    guestWithoutIp.token.access.length > 0,
  );

  // Test 3: Guest registration with null IP address
  const guestWithNullIp = await api.functional.auth.guest.join(connection, {
    body: {
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppGuest.ICreate,
  });
  typia.assert(guestWithNullIp);
  TestValidator.predicate(
    "guest with null IP has valid ID",
    guestWithNullIp.id.length > 0,
  );
  TestValidator.predicate(
    "guest with null IP has session identifier",
    guestWithNullIp.session_identifier.length > 0,
  );
  TestValidator.predicate(
    "guest with null IP has token",
    guestWithNullIp.token.access.length > 0,
  );

  // Test 4: Guest registration with undefined IP address
  const guestWithUndefinedIp = await api.functional.auth.guest.join(
    connection,
    {
      body: {
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        // ip property not included, making it undefined
      } satisfies ITodoAppGuest.ICreate,
    },
  );
  typia.assert(guestWithUndefinedIp);
  TestValidator.predicate(
    "guest with undefined IP has valid ID",
    guestWithUndefinedIp.id.length > 0,
  );
  TestValidator.predicate(
    "guest with undefined IP has session identifier",
    guestWithUndefinedIp.session_identifier.length > 0,
  );
  TestValidator.predicate(
    "guest with undefined IP has token",
    guestWithUndefinedIp.token.access.length > 0,
  );

  // Validate token authorization is properly set for all guests
  TestValidator.equals(
    "token access set in headers",
    connection.headers?.Authorization,
    guestWithIp.token.access,
  );

  // Verify guest IDs are unique across different sessions
  TestValidator.notEquals(
    "guest IDs are unique",
    guestWithIp.id,
    guestWithoutIp.id,
  );
  TestValidator.notEquals(
    "session identifiers are unique",
    guestWithIp.session_identifier,
    guestWithoutIp.session_identifier,
  );
  TestValidator.notEquals(
    "access tokens are unique",
    guestWithIp.token.access,
    guestWithoutIp.token.access,
  );
}
