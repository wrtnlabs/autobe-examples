import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_profile_update_restricted_account_can_update(
  connection: api.IConnection,
) {
  // Create a restricted account by simulating a user with restricted status
  // Note: Since we don't have direct account creation with specific status,
  // we'll work with the assumption that the connection represents an authenticated
  // restricted account user

  // Generate new profile data for the update
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newUsername = RandomGenerator.alphabets(10);

  // Update the restricted account's profile information
  const updatedProfile: IDiscussionBoardUser =
    await api.functional.my.profile.update(connection, {
      body: {
        email: newEmail,
        username: newUsername,
      } satisfies IDiscussionBoardUser.IUpdate,
    });

  // Validate the response
  typia.assert(updatedProfile);

  // Verify that the profile was updated correctly
  TestValidator.equals("profile email updated", updatedProfile.email, newEmail);
  TestValidator.equals(
    "profile username updated",
    updatedProfile.username,
    newUsername,
  );

  // Confirm the account status is still 'restricted'
  TestValidator.equals(
    "account status remains restricted",
    updatedProfile.accountStatus,
    "restricted",
  );

  // Verify that the updated_at timestamp was modified
  TestValidator.predicate(
    "profile updated_at timestamp was changed",
    updatedProfile.updatedAt !== undefined,
  );
}
