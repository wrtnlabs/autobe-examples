import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration with optional IP address field provided.
 *
 * This test validates the member registration endpoint when the client
 * explicitly provides the IP address field. This is particularly useful in
 * server-side rendering scenarios where the actual client IP needs to be
 * tracked rather than the server's IP.
 *
 * Test Steps:
 *
 * 1. Generate valid registration data including email, password, username
 * 2. Explicitly provide an IPv4 address for the optional ip field
 * 3. Provide valid href and referrer URIs for session tracking
 * 4. Call the member registration API
 * 5. Verify successful registration with proper response structure
 * 6. Validate that JWT tokens are issued correctly
 */
export async function test_api_member_registration_with_optional_ip(
  connection: api.IConnection,
) {
  // Generate registration data with explicit IP address
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.name();
  const clientIp = "192.168.1.100"; // Explicit IPv4 address for testing
  const href = "https://example.com/register";
  const referrer = "https://example.com/home";

  // Register new member with optional IP field provided
  const registeredMember = await api.functional.auth.member.join(connection, {
    body: {
      email: email,
      password: password,
      username: username,
      ip: clientIp,
      href: href,
      referrer: referrer,
    } satisfies IDiscussionBoardMember.ICreate,
  });

  // Validate the registration response
  typia.assert(registeredMember);

  // Verify member data is correctly populated
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    email,
  );
  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    username,
  );

  // Verify JWT tokens are present
  TestValidator.predicate(
    "access token is provided",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    registeredMember.token.refresh.length > 0,
  );

  // Verify member status is properly initialized
  TestValidator.predicate(
    "member status is set",
    registeredMember.status.length > 0,
  );
}
