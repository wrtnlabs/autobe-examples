import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const joinResponse: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoAppUser.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Retrieve the user's profile using the authenticated connection
  const userProfile: ITodoAppUser = await api.functional.todoApp.users.at(
    connection,
    {
      userId: joinResponse.id,
    },
  );
  typia.assert(userProfile);

  // Step 3: Validate profile data
  // Ensure the profile has the correct user ID
  TestValidator.equals(
    "profile ID matches auth ID",
    userProfile.id,
    joinResponse.id,
  );

  // Validate email matches the registered email
  TestValidator.equals(
    "profile email matches registered email",
    userProfile.email,
    userEmail,
  );

  // Validate timestamps have ISO format
  TestValidator.predicate(
    "created_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(userProfile.created_at),
  );
  TestValidator.predicate(
    "updated_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(userProfile.updated_at),
  );

  // Ensure password_hash is not present in response (security validation)
  TestValidator.equals(
    "password_hash is undefined",
    userProfile.password_hash,
    undefined,
  );

  // Ensure deleted_at is undefined (account active)
  TestValidator.equals(
    "deleted_at is undefined",
    userProfile.deleted_at,
    undefined,
  );
}
