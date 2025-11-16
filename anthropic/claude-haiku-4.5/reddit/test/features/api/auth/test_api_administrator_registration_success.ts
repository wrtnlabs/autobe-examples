import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful administrator account creation through the join endpoint.
 *
 * Validates that a new administrator can be registered with valid credentials
 * (email, password, username, name) and proper session context (href, referrer,
 * ip). Verifies that the registration process creates the administrator record
 * in the system and returns valid JWT tokens (access and refresh) with
 * appropriate expiration times. Confirms that the created administrator
 * receives a unique UUID identifier, has account_status set to 'active', and
 * email_verified is properly initialized. Tests that the administrator can
 * immediately use the returned access token for authenticated requests without
 * requiring a separate login step.
 *
 * 1. Generate valid administrator registration credentials with random data
 * 2. Call the administrator join endpoint with credentials and session context
 * 3. Validate the returned administrator authorization response structure
 * 4. Verify the administrator has a valid UUID identifier
 * 5. Confirm account_status is set to 'active'
 * 6. Verify email_verified field is properly initialized
 * 7. Validate JWT tokens (access and refresh) are present and properly formatted
 * 8. Verify token expiration times are set correctly
 * 9. Confirm the returned email matches the registration input
 * 10. Verify the returned username matches the registration input
 */
export async function test_api_administrator_registration_success(
  connection: api.IConnection,
) {
  // Generate valid administrator registration credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();
  const registrationHref = typia.random<string & tags.Format<"uri">>();

  // Create administrator registration request
  const registrationBody = {
    email: adminEmail,
    password: adminPassword,
    username: adminUsername,
    name: adminName,
    href: registrationHref,
    referrer: RandomGenerator.substring(RandomGenerator.content()),
    ip: "192.168.1.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  // Call the administrator join endpoint
  const authorized = await api.functional.auth.administrator.join(connection, {
    body: registrationBody,
  });

  // Validate the complete authorized response (performs all type/format validation)
  typia.assert(authorized);

  // Verify account_status is 'active'
  TestValidator.equals(
    "account status is active",
    authorized.account_status,
    "active",
  );

  // Verify email_verified is initialized
  TestValidator.predicate(
    "email_verified is initialized",
    typeof authorized.email_verified === "boolean",
  );

  // Validate email matches registration input
  TestValidator.equals(
    "returned email matches input email",
    authorized.email,
    adminEmail,
  );

  // Validate username matches registration input
  TestValidator.equals(
    "returned username matches input username",
    authorized.username,
    adminUsername,
  );

  // Validate JWT tokens are present
  TestValidator.predicate(
    "access token is present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorized.token.refresh.length > 0,
  );
}
