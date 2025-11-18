import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test retrieval of complete user account data including all available fields.
 * Validates that the API returns comprehensive profile information including
 * email, display name, account status, creation and update timestamps, and
 * handles null name field appropriately. Ensures data integrity and
 * completeness of user profile responses.
 *
 * Business Flow:
 *
 * 1. Create user account with complete profile data including optional name field
 * 2. Authenticate the user to establish session context for profile access
 * 3. Retrieve comprehensive user profile data via the user endpoint
 * 4. Validate all expected fields are present including optional name field
 *    handling
 * 5. Verify data integrity and completeness of the response structure
 */
export async function test_api_user_profile_retrieval_complete_account_data(
  connection: api.IConnection,
) {
  // Step 1: Create user account with complete profile data including optional name field
  const registeredEmail = typia.random<string & tags.Format<"email">>();
  const registeredName = RandomGenerator.name();

  const newUser: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: registeredEmail,
        password: "testPassword123",
        name: registeredName,
        href: "https://example.com/todo",
        referrer: "https://example.com/todo",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(newUser);

  // Step 2: User is automatically authenticated after join - establish session context

  // Step 3: Retrieve comprehensive user profile data via the user endpoint
  const userProfile: ITodoAppUser = await api.functional.todoApp.user.users.at(
    connection,
    {
      userId: newUser.id,
    },
  );
  typia.assert(userProfile);

  // Step 4: Validate all expected fields are present including optional name field handling
  TestValidator.equals(
    "user profile ID matches created user",
    userProfile.id,
    newUser.id,
  );
  TestValidator.equals(
    "email matches registration data",
    userProfile.email,
    registeredEmail,
  );

  // Handle the optional name field - it may be null, undefined, or contain the name
  if (userProfile.name !== null && userProfile.name !== undefined) {
    TestValidator.equals(
      "name field matches registration",
      userProfile.name,
      registeredName,
    );
  } else {
    // Verify that null/undefined name is handled correctly by the API
    TestValidator.predicate(
      "name field is properly null or undefined",
      userProfile.name === null || userProfile.name === undefined,
    );
  }

  TestValidator.equals(
    "account status should be active",
    userProfile.status,
    "active",
  );

  // Step 5: Verify data integrity and completeness of the response structure
  // Ensure timestamps are present and properly formatted
  TestValidator.predicate(
    "created_at timestamp is present",
    userProfile.created_at !== null && userProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    userProfile.updated_at !== null && userProfile.updated_at !== undefined,
  );

  // Validate timestamp formats (ISO 8601 date-time)
  const createdDate = new Date(userProfile.created_at);
  const updatedDate = new Date(userProfile.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO 8601 date-time",
    !isNaN(createdDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 date-time",
    !isNaN(updatedDate.getTime()),
  );

  // Verify deleted_at is handled appropriately (should be null/undefined for active users)
  TestValidator.predicate(
    "deleted_at is null or undefined for active account",
    userProfile.deleted_at === null || userProfile.deleted_at === undefined,
  );
}
