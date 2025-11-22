import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test member registration with optional first and last name fields.
 *
 * Validates that optional profile fields (first_name and last_name) are
 * properly stored and displayed in member profile information for personalized
 * Todo management experience. This test ensures that when users provide
 * optional name information during registration, it is correctly processed and
 * available for user interface personalization, communication features, and
 * complete member identification throughout the TodoApp system.
 *
 * The test validates the complete member onboarding flow including:
 *
 * - Registration with optional name fields
 * - Proper storage of profile data
 * - Complete member profile response with all fields
 * - Authentication token generation for immediate TodoApp access
 */
export async function test_api_member_registration_optional_names(
  connection: api.IConnection,
) {
  // Generate test member data with optional name fields
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testFirstName = RandomGenerator.name(1); // Single word for first name
  const testLastName = RandomGenerator.name(1); // Single word for last name

  // Create member registration request with optional fields
  const memberData = {
    email: testEmail,
    first_name: testFirstName,
    last_name: testLastName,
    status: "active" as const, // Use const assertion for literal type
  } satisfies ITodoAppMember.ICreate;

  // Register new member with optional name fields
  const registeredMember: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: memberData,
    });

  // Validate response type and structure
  typia.assert(registeredMember);

  // Verify all fields are properly stored and returned
  TestValidator.equals(
    "email matches input data",
    registeredMember.email,
    testEmail,
  );

  TestValidator.equals(
    "first_name is preserved",
    registeredMember.first_name,
    testFirstName,
  );

  TestValidator.equals(
    "last_name is preserved",
    registeredMember.last_name,
    testLastName,
  );

  TestValidator.equals(
    "status is set to active",
    registeredMember.status,
    "active",
  );

  // Validate member ID is generated
  TestValidator.predicate(
    "member ID is generated",
    registeredMember.id.length > 0,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "created_at timestamp is present",
    registeredMember.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at timestamp is present",
    registeredMember.updated_at.length > 0,
  );

  // Validate authentication token is generated
  TestValidator.predicate(
    "access token is generated",
    registeredMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is generated",
    registeredMember.token.refresh.length > 0,
  );

  // Verify token expiration times are set
  TestValidator.predicate(
    "access token has expiration time",
    registeredMember.token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refresh token has expiration time",
    registeredMember.token.refreshable_until.length > 0,
  );
}
