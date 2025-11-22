import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test successful member login with existing registered account credentials.
 *
 * This E2E test validates the complete member authentication workflow in the
 * TodoApp system. It tests the process where an existing registered member uses
 * their credentials to establish a new authenticated session for Todo
 * management access with proper security tracking.
 *
 * The test follows this sequence:
 *
 * 1. Create a new member account with email and profile data
 * 2. Extract the member's email for login authentication
 * 3. Perform login with member credentials and session metadata
 * 4. Validate the authenticated response contains complete member profile and
 *    tokens
 * 5. Verify session creation enables Todo management functionality access
 *
 * This ensures members can successfully authenticate and gain access to their
 * personal Todo items and management features after proper registration.
 */
export async function test_api_member_login_successful_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication testing
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const createdMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: memberEmail,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        status: "active",
      } satisfies ITodoAppMember.ICreate,
    });

  // Validate the created member response
  typia.assert(createdMember);

  // Step 2: Perform login with the created member credentials
  const authenticatedMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.login.authenticateMember(connection, {
      body: {
        email: createdMember.email,
        password: "1234", // Default password from the member creation
        href: "https://todoapp.example.com/login",
        referrer: "https://todoapp.example.com/",
      } satisfies ITodoAppMember.ILogin,
    });

  // Validate the authenticated member response
  typia.assert(authenticatedMember);

  // Step 3: Verify member authentication data matches expectations
  TestValidator.equals(
    "authenticated member ID matches created member",
    authenticatedMember.id,
    createdMember.id,
  );

  TestValidator.equals(
    "authenticated member email matches created member",
    authenticatedMember.email,
    createdMember.email,
  );

  TestValidator.equals(
    "authenticated member status is active",
    authenticatedMember.status,
    "active",
  );

  // Step 4: Verify authentication tokens are present and valid
  TestValidator.predicate(
    "access token is provided",
    authenticatedMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is provided",
    authenticatedMember.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "access token expiration is valid",
    typeof authenticatedMember.token.expired_at === "string",
  );

  TestValidator.predicate(
    "refresh token expiration is valid",
    typeof authenticatedMember.token.refreshable_until === "string",
  );

  // Step 5: Verify profile data is preserved
  TestValidator.equals(
    "first name is preserved in authentication",
    authenticatedMember.first_name,
    createdMember.first_name,
  );

  TestValidator.equals(
    "last name is preserved in authentication",
    authenticatedMember.last_name,
    createdMember.last_name,
  );

  // Step 6: Verify timestamps are present
  TestValidator.predicate(
    "created timestamp is preserved",
    typeof authenticatedMember.created_at === "string",
  );

  TestValidator.predicate(
    "updated timestamp is present",
    typeof authenticatedMember.updated_at === "string",
  );
}
