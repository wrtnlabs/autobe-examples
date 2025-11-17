import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_user_profile_update_by_owner(
  connection: api.IConnection,
) {
  // Register new user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username:
        RandomGenerator.alphabets(8) + "_" + RandomGenerator.alphaNumeric(3),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Create a community as required by prerequisites
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        slug: RandomGenerator.alphabets(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        rules: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        privacy_level: "public" as const,
        status: "active" as const,
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Update the user's profile
  const newUsername = RandomGenerator.alphabets(8) + "_updated";
  const updatedUser = await api.functional.communityForum.users.update(
    connection,
    {
      username: userJoin.username,
      body: {
        username: newUsername,
      } satisfies ICommunityForumCommunityUser.IUpdate,
    },
  );
  typia.assert(updatedUser);

  // Verify the update was successful
  TestValidator.equals(
    "username should be updated",
    updatedUser.username,
    newUsername,
  );
  TestValidator.equals(
    "email should remain the same",
    updatedUser.email,
    userJoin.email,
  );
  TestValidator.equals(
    "id should remain the same",
    updatedUser.id,
    userJoin.id,
  );
  TestValidator.predicate(
    "updated_at should be set",
    () =>
      updatedUser.updated_at !== undefined && updatedUser.updated_at !== null,
  );
}
