import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_user_profile_update_with_invalid_data(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinBody = {
    email: userEmail,
    password: "testPassword123!",
    username:
      RandomGenerator.name(1).replace(/\s/g, "_").toLowerCase() +
      "_" +
      RandomGenerator.alphaNumeric(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const userAuth: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(userAuth);

  // Step 2: Create a community as required by endpoint prerequisites
  const communityCreateBody = {
    name:
      RandomGenerator.name(2).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    slug:
      RandomGenerator.name(1).replace(/\s/g, "-").toLowerCase() +
      "-" +
      RandomGenerator.alphaNumeric(5),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: RandomGenerator.pick(["active", "inactive", "archived"] as const),
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // Step 3: Test updating profile with invalid data - empty username
  await TestValidator.error("should reject empty username", async () => {
    await api.functional.communityForum.users.update(connection, {
      username: userAuth.username,
      body: {
        username: "",
      } satisfies ICommunityForumCommunityUser.IUpdate,
    });
  });

  // Step 4: Test updating profile with invalid data - username too long
  await TestValidator.error(
    "should reject username that is too long",
    async () => {
      // Generate a username that exceeds the 21 character limit
      const longUsername = RandomGenerator.alphabets(22);
      await api.functional.communityForum.users.update(connection, {
        username: userAuth.username,
        body: {
          username: longUsername,
        } satisfies ICommunityForumCommunityUser.IUpdate,
      });
    },
  );

  // Step 5: Test updating profile with invalid data - username with invalid characters
  await TestValidator.error(
    "should reject username with invalid characters",
    async () => {
      // Use characters that are not alphanumeric or underscores
      const invalidUsername = "user@name!";
      await api.functional.communityForum.users.update(connection, {
        username: userAuth.username,
        body: {
          username: invalidUsername,
        } satisfies ICommunityForumCommunityUser.IUpdate,
      });
    },
  );
}
