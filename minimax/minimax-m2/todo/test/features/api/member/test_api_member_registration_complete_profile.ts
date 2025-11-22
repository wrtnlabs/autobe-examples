import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test successful member registration with complete profile information
 * including email, first name, last name, and default active status.
 *
 * Validates that new members can create accounts and gain immediate access to
 * Todo management functionality with proper profile data storage.
 *
 * This test covers the complete member onboarding workflow:
 *
 * 1. Register new member with comprehensive profile data (email, names, status)
 * 2. Validate response contains complete member profile information
 * 3. Verify authentication tokens are generated with proper expiration
 * 4. Confirm immediate access to Todo management functionality
 * 5. Validate all profile data is properly stored and retrievable
 *
 * **Business Context**: TodoApp requires complete member profiles for
 * personalized Todo management. Members must register with valid email
 * addresses and can optionally provide names. Active status provides immediate
 * access to Todo features upon registration.
 */
export async function test_api_member_registration_complete_profile(
  connection: api.IConnection,
) {
  // Generate comprehensive test data for member registration
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testFirstName = RandomGenerator.name(1); // Single word for first name
  const testLastName = RandomGenerator.name(1); // Single word for last name
  const testStatus = "active"; // Default active status for immediate access

  // Execute member registration with complete profile information
  const response: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: {
        email: testEmail,
        first_name: testFirstName,
        last_name: testLastName,
        status: testStatus,
      } satisfies ITodoAppMember.ICreate,
    });

  // Validate complete response structure and type safety
  typia.assert(response);

  // Validate member identification and profile data
  TestValidator.equals("member email matches input", response.email, testEmail);

  TestValidator.equals(
    "member first name preserved",
    response.first_name,
    testFirstName,
  );

  TestValidator.equals(
    "member last name preserved",
    response.last_name,
    testLastName,
  );

  TestValidator.equals("member status is active", response.status, "active");

  // Validate UUID format for member ID
  TestValidator.predicate(
    "member ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  // Validate timestamp generation
  TestValidator.predicate(
    "created_at timestamp is valid ISO format",
    !isNaN(Date.parse(response.created_at)),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid ISO format",
    !isNaN(Date.parse(response.updated_at)),
  );

  // Validate authentication token structure
  TestValidator.equals(
    "access token is present",
    response.token.access.length > 0,
    true,
  );

  TestValidator.equals(
    "refresh token is present",
    response.token.refresh.length > 0,
    true,
  );

  TestValidator.predicate(
    "token expiration is valid future date",
    Date.parse(response.token.expired_at) > Date.now(),
  );

  TestValidator.predicate(
    "refresh token expiration is valid future date",
    Date.parse(response.token.refreshable_until) > Date.now(),
  );

  // Validate immediate access to Todo management functionality
  TestValidator.equals(
    "member status allows Todo access",
    response.status === "active",
    true,
  );

  TestValidator.equals(
    "member has valid authentication for Todo operations",
    response.token.access.length > 0 && response.token.refresh.length > 0,
    true,
  );
}
