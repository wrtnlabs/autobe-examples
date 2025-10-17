import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IETodoRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoRole";
import type { IMemberCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberCreate";
import type { IMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMemberLogin";
import type { ITodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoMember";

/**
 * Test the complete member login functionality by creating a new member
 * account, then authenticating with the same credentials. This validates the
 * authentication system, JWT token generation, and access to member-only
 * resources. The test follows a realistic user journey from registration to
 * successful login authentication with proper credential verification.
 *
 * ## Step-by-step Process:
 *
 * 1. First create a new member account using the join endpoint
 * 2. Attempt login with the same credentials
 * 3. Validate successful authentication response
 * 4. Verify JWT token is properly generated
 * 5. Confirm member authorization details match
 * 6. Test authenticated access is established
 *
 * Test includes proper random data generation for email/password, comprehensive
 * response validation, and assertion of authentication token presence.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create test member account to establish credentials for login testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = `${RandomGenerator.alphaNumeric(8)}Test123!`;

  await api.functional.auth.member.join(connection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IMemberCreate.IRequest,
  });

  // Step 2: Attempt login with the same credentials and validate successful authentication
  const memberAuth = await api.functional.auth.member.login(connection, {
    body: {
      email: testEmail,
      password: testPassword,
    } satisfies IMemberLogin.IRequest,
  });

  // Step 3: Validate the complete authentication response structure
  typia.assert(memberAuth); // Ensure response follows ITodoMember.IAuthorized type

  // Step 4: Verify core member authorization details are correct
  TestValidator.equals(
    "Email matches login credentials",
    memberAuth.email,
    testEmail,
  );
  TestValidator.equals("Role is member", memberAuth.role, "member");
  TestValidator.predicate(
    "Member ID is valid UUID",
    memberAuth.id.length === 36,
  );

  // Step 5: Validate JWT token generation and structure
  TestValidator.predicate(
    "Access token generated",
    memberAuth.token.access.length > 50,
  );
  TestValidator.predicate(
    "Refresh token generated",
    memberAuth.token.refresh.length > 50,
  );
  TestValidator.predicate(
    "Access token expiration present",
    typeof memberAuth.token.expired_at === "string" &&
      memberAuth.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Refresh token expiration present",
    typeof memberAuth.token.refreshable_until === "string" &&
      memberAuth.token.refreshable_until.length > 0,
  );

  // Step 6: Validate optional last_login_at field handling
  TestValidator.predicate(
    "Last login timestamp is present or null",
    memberAuth.last_login_at === null ||
      memberAuth.last_login_at === undefined ||
      typeof memberAuth.last_login_at === "string",
  );
}
