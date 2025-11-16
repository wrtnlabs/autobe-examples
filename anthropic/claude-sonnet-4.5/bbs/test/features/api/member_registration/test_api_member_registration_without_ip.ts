import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member registration without providing the optional IP address field.
 *
 * This test validates that the member registration endpoint correctly handles
 * the optional `ip` field by omitting it from the request. The server should
 * accept the registration and automatically extract the IP address from the
 * request headers.
 *
 * Steps:
 *
 * 1. Generate random valid member registration data
 * 2. Omit the `ip` field from the request body
 * 3. Call the registration API endpoint
 * 4. Verify successful registration with valid response data
 * 5. Validate that authentication tokens are properly issued
 */
export async function test_api_member_registration_without_ip(
  connection: api.IConnection,
) {
  // Generate registration data without the ip field
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  // Register the member without providing ip field
  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  // Validate the response structure (this validates ALL properties including nested ones)
  typia.assert(registeredMember);

  // Verify the member data matches what was submitted
  TestValidator.equals(
    "email matches",
    registeredMember.email,
    registrationData.email,
  );
  TestValidator.equals(
    "username matches",
    registeredMember.username,
    registrationData.username,
  );

  // Verify authentication tokens are present
  TestValidator.predicate(
    "access token exists",
    registeredMember.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registeredMember.token.refresh.length > 0,
  );
}
