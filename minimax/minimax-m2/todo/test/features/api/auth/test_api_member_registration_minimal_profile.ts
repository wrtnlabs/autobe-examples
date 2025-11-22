import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test member registration with minimal required profile data including only
 * email address and active status. Validates that members can register with
 * minimal information while maintaining proper account activation and access to
 * Todo features.
 *
 * This test validates the core member registration functionality by creating a
 * new member account using only the essential required fields (email and
 * status). The test verifies that:
 *
 * 1. Members can register with minimal information
 * 2. Email validation works correctly
 * 3. Status assignment is properly handled
 * 4. Authentication tokens are generated correctly
 * 5. Member profile data is returned accurately
 *
 * Business flow:
 *
 * 1. Generate random minimal member data (email + active status)
 * 2. Register member through API
 * 3. Validate response structure and authentication tokens
 * 4. Verify member data matches input requirements
 * 5. Confirm proper access level assignment for Todo functionality
 */
export async function test_api_member_registration_minimal_profile(
  connection: api.IConnection,
) {
  // Generate minimal test data with only required fields
  const testEmail = typia.random<string & tags.Format<"email">>();

  const memberData = {
    email: testEmail,
    status: "active",
  } satisfies ITodoAppMember.ICreate;

  // Register new member with minimal profile data
  const member: ITodoAppMember.IAuthorized =
    await api.functional.auth.member.join.registerMember(connection, {
      body: memberData,
    });

  // Validate response structure and type safety
  typia.assert(member);

  // Verify email address is correctly set
  TestValidator.equals("member email matches input", member.email, testEmail);

  // Verify status is properly assigned to active
  TestValidator.equals("member status is active", member.status, "active");

  // Verify UUID format for member ID
  TestValidator.predicate(
    "member ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      member.id,
    ),
  );

  // Verify access token is present and valid format
  TestValidator.predicate(
    "authentication token exists",
    member.token.access.length > 0,
  );

  // Verify refresh token is present
  TestValidator.predicate(
    "refresh token exists",
    member.token.refresh.length > 0,
  );

  // Verify timestamps are properly formatted
  TestValidator.predicate(
    "created_at timestamp is valid",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(?:Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
      member.created_at,
    ),
  );

  // Verify updated_at timestamp is present
  TestValidator.predicate(
    "updated_at timestamp exists",
    member.updated_at.length > 0,
  );

  // Verify first_name and last_name are undefined (not provided in minimal data)
  TestValidator.equals(
    "first_name is undefined when not provided",
    member.first_name,
    undefined,
  );
  TestValidator.equals(
    "last_name is undefined when not provided",
    member.last_name,
    undefined,
  );

  // Verify member has immediate access to Todo features through active status
  TestValidator.predicate(
    "member has active status for Todo access",
    member.status === "active",
  );
}
