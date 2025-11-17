import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // Register a new user
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    username: RandomGenerator.alphabets(10), // Generate a valid username within constraints
  } satisfies ICommunityForumCommunityUser.IJoin;

  const userAuth: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(userAuth);

  // Update the user's username
  const newUsername = RandomGenerator.alphabets(15); // Generate another valid username
  const updateInput = {
    username: newUsername,
  } satisfies ICommunityForumCommunityUser.IUpdate;

  const updatedUser: ICommunityForumCommunityUser =
    await api.functional.communityForum.user.users.update(connection, {
      username: userAuth.username,
      body: updateInput,
    });
  typia.assert(updatedUser);

  // Verify the update was successful
  TestValidator.equals(
    "username should be updated",
    updatedUser.username,
    newUsername,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedUser.email,
    joinInput.email,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedUser.id,
    userAuth.id,
  );
}
