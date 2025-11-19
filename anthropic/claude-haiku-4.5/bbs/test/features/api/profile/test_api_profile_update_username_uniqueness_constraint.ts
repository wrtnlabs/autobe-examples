import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

export async function test_api_profile_update_username_uniqueness_constraint(
  connection: api.IConnection,
) {
  // Step 1: Update the authenticated user's profile with a unique username
  const initialUsername = RandomGenerator.alphabets(8);
  const userProfile = await api.functional.my.profile.update(connection, {
    body: {
      username: initialUsername,
    } satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(userProfile);
  TestValidator.equals(
    "user profile updated with unique username",
    userProfile.username,
    initialUsername,
  );

  // Step 2: Attempt to update email along with the same username (should succeed)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updatedProfile = await api.functional.my.profile.update(connection, {
    body: {
      email: newEmail,
      username: initialUsername,
    } satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(updatedProfile);
  TestValidator.equals(
    "email updated successfully",
    updatedProfile.email,
    newEmail,
  );
  TestValidator.equals(
    "username remains the same",
    updatedProfile.username,
    initialUsername,
  );

  // Step 3: Update username to a different value (should succeed)
  const secondUsername = RandomGenerator.alphabets(8);
  const secondUpdate = await api.functional.my.profile.update(connection, {
    body: {
      username: secondUsername,
    } satisfies IDiscussionBoardUser.IUpdate,
  });
  typia.assert(secondUpdate);
  TestValidator.equals(
    "username updated to new value",
    secondUpdate.username,
    secondUsername,
  );

  // Step 4: Verify profile response structure contains all expected fields
  TestValidator.predicate(
    "profile has id field",
    typeof secondUpdate.id === "string" && secondUpdate.id.length > 0,
  );
  TestValidator.predicate(
    "profile has email field",
    typeof secondUpdate.email === "string" && secondUpdate.email.includes("@"),
  );
  TestValidator.predicate(
    "profile has username field",
    typeof secondUpdate.username === "string" &&
      secondUpdate.username.length > 0,
  );
  TestValidator.predicate(
    "profile has accountStatus field",
    ["active", "suspended", "restricted", "deleted"].includes(
      secondUpdate.accountStatus,
    ),
  );
  TestValidator.predicate(
    "profile has emailVerified field",
    typeof secondUpdate.emailVerified === "boolean",
  );
}
