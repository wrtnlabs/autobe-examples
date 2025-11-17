import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Create a new user through registration
  const joinInput = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: RandomGenerator.alphabets(12),
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const registeredUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(registeredUser);

  // Retrieve the user's public profile by username without authentication
  const userProfile: ICommunityForumCommunityUser =
    await api.functional.communityForum.users.at(connection, {
      username: registeredUser.username,
    });
  typia.assert(userProfile);

  // Validate that the retrieved profile matches the registered user's public information
  TestValidator.equals("user id matches", userProfile.id, registeredUser.id);
  TestValidator.equals(
    "user email matches",
    userProfile.email,
    registeredUser.email,
  );
  TestValidator.equals(
    "user username matches",
    userProfile.username,
    registeredUser.username,
  );
  TestValidator.equals(
    "user created_at matches",
    userProfile.created_at,
    registeredUser.created_at,
  );

  // Validate that sensitive information is not exposed in the public profile
  // The ICommunityForumCommunityUser DTO should not contain password or token fields
  TestValidator.equals(
    "password field should not exist in public profile",
    userProfile.hasOwnProperty("password_hash"),
    false,
  );
  TestValidator.equals(
    "token field should not exist in public profile",
    userProfile.hasOwnProperty("token"),
    false,
  );

  // Check that updated_at is either undefined or matches the registered user's value
  TestValidator.equals(
    "user updated_at matches or is undefined",
    userProfile.updated_at,
    registeredUser.updated_at,
  );
}
