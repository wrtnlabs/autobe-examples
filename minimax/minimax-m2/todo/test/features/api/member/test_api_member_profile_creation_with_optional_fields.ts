import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";

/**
 * Test member profile creation with all optional fields populated to validate
 * complete data handling.
 *
 * This E2E test validates the complete member onboarding flow where users
 * provide full profile information including optional personal details. The
 * test ensures that optional fields like first_name and last_name are properly
 * stored, displayed, and integrated with the core member functionality. It
 * validates that name fields work correctly for personalization and that status
 * selection appropriately affects account access levels.
 *
 * The test follows a realistic business flow: create profile with optional data
 * → validate data persistence and accessibility. This ensures optional
 * information enhances the user experience without breaking core
 * functionality.
 */
export async function test_api_member_profile_creation_with_optional_fields(
  connection: api.IConnection,
) {
  // Step 1: Create member profile with comprehensive optional field data
  const profileData = {
    email: typia.random<string & tags.Format<"email">>(),
    first_name: "Jane",
    last_name: "Smith",
    status: "active" as const,
  } satisfies ITodoAppMember.ICreate;

  const createdProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: profileData,
    });
  typia.assert(createdProfile);

  // Step 2: Validate all optional fields are properly stored and accessible
  TestValidator.equals(
    "profile email matches input",
    createdProfile.email,
    profileData.email,
  );
  TestValidator.equals(
    "profile first_name matches input",
    createdProfile.first_name,
    "Jane",
  );
  TestValidator.equals(
    "profile last_name matches input",
    createdProfile.last_name,
    "Smith",
  );
  TestValidator.equals(
    "profile status matches input",
    createdProfile.status,
    "active",
  );

  // Step 3: Validate required system fields are present and properly formatted
  TestValidator.predicate(
    "profile has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdProfile.id,
    ),
  );
  TestValidator.predicate(
    "profile has valid created_at timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/i.test(
      createdProfile.created_at,
    ),
  );
  TestValidator.predicate(
    "profile has valid updated_at timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/i.test(
      createdProfile.updated_at,
    ),
  );
  TestValidator.equals(
    "profile deleted_at is undefined",
    createdProfile.deleted_at,
    undefined,
  );

  // Step 4: Test profile creation with only required fields (minimal case)
  const minimalProfileData = {
    email: typia.random<string & tags.Format<"email">>(),
    status: "active" as const,
  } satisfies ITodoAppMember.ICreate;

  const minimalProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: minimalProfileData,
    });
  typia.assert(minimalProfile);

  // Step 5: Validate minimal profile creation (optional fields should be undefined)
  TestValidator.equals(
    "minimal profile email matches",
    minimalProfile.email,
    minimalProfileData.email,
  );
  TestValidator.equals(
    "minimal profile first_name is undefined",
    minimalProfile.first_name,
    undefined,
  );
  TestValidator.equals(
    "minimal profile last_name is undefined",
    minimalProfile.last_name,
    undefined,
  );
  TestValidator.equals(
    "minimal profile status matches",
    minimalProfile.status,
    minimalProfileData.status,
  );

  // Step 6: Test with different status values for access level validation
  const suspendedProfileData = {
    email: typia.random<string & tags.Format<"email">>(),
    first_name: "Bob",
    last_name: "Johnson",
    status: "suspended" as const,
  } satisfies ITodoAppMember.ICreate;

  const suspendedProfile: ITodoAppMember =
    await api.functional.todoApp.member.members.create(connection, {
      body: suspendedProfileData,
    });
  typia.assert(suspendedProfile);

  // Step 7: Validate suspended account handling with optional fields
  TestValidator.equals(
    "suspended profile has correct status",
    suspendedProfile.status,
    "suspended",
  );
  TestValidator.equals(
    "suspended profile preserves optional fields",
    suspendedProfile.first_name,
    "Bob",
  );
  TestValidator.equals(
    "suspended profile preserves last name",
    suspendedProfile.last_name,
    "Johnson",
  );
}
