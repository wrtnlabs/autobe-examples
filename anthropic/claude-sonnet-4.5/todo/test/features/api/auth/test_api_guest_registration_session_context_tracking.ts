import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test that session context information (IP, href, referrer) is properly
 * captured and stored during guest user registration.
 *
 * This test validates that when a guest user registers with complete session
 * context data including IP address, connection URL (href), and referrer URL,
 * the registration API successfully accepts and processes this information. The
 * session context enables audit trails, security monitoring, and analytics.
 *
 * Test workflow:
 *
 * 1. Generate valid guest registration data with session context
 * 2. Call guest registration API with IP, href, and referrer information
 * 3. Verify successful registration returns user ID and JWT tokens
 * 4. Validate response structure and integrity
 */
export async function test_api_guest_registration_session_context_tracking(
  connection: api.IConnection,
) {
  // Generate realistic session context data
  const ipAddress = typia.random<string & tags.Format<"ipv4">>();
  const connectionUrl = typia.random<string & tags.Format<"url">>();
  const referrerUrl = typia.random<string & tags.Format<"url">>();

  // Create guest registration request with complete session context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    ip: ipAddress,
    href: connectionUrl,
    referrer: referrerUrl,
  } satisfies ITodoListGuest.ICreate;

  // Register guest user with session context
  const authorizedGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate response structure - this validates EVERYTHING including all types, formats, and constraints
  typia.assert(authorizedGuest);
}
