import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test successful member registration workflow.
 *
 * This test validates the complete member registration process for the
 * discussion board. A new user provides valid email, password, username, and
 * session context to create an account. The system validates input, creates the
 * member record, and immediately authenticates by issuing JWT tokens. The test
 * verifies all response fields including member details, status, verification
 * flags, timestamps, and authentication tokens.
 *
 * Steps:
 *
 * 1. Generate valid registration data (email, password, username, session info)
 * 2. Call the member registration endpoint
 * 3. Validate the response contains all expected member information
 * 4. Verify the status is 'active' for new registrations
 * 5. Verify email_verified is false (requires verification)
 * 6. Confirm the access token is automatically set in connection headers
 */
export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Step 2: Call the member registration endpoint
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the response structure (COMPLETE validation - no additional checks needed)
  typia.assert(registeredMember);

  // Step 4: Verify registration data matches response (business logic validation)
  TestValidator.equals(
    "registered email matches input",
    registeredMember.email,
    registrationData.email,
  );

  TestValidator.equals(
    "registered username matches input",
    registeredMember.username,
    registrationData.username,
  );

  // Step 5: Confirm the status is 'active' for new registrations (business rule validation)
  TestValidator.equals(
    "new member status should be active",
    registeredMember.status,
    "active",
  );

  // Step 6: Verify email_verified is false (business logic validation)
  TestValidator.equals(
    "email should not be verified initially",
    registeredMember.email_verified,
    false,
  );

  // Step 7: Verify the access token is set in connection headers (API behavior validation)
  TestValidator.equals(
    "access token should be set in connection Authorization header",
    connection.headers?.Authorization,
    registeredMember.token.access,
  );
}
