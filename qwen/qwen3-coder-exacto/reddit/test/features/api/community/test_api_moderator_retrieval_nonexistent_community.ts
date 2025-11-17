import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_retrieval_nonexistent_community(
  connection: api.IConnection,
) {
  // First, authenticate as a regular user to attempt moderator retrieval
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username:
      RandomGenerator.name(1)
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 20) || "user_" + RandomGenerator.alphabets(5),
  } satisfies ICommunityForumCommunityUser.IJoin;

  // Ensure username meets minimum length requirement of 3 characters
  if (userJoin.username.length < 3) {
    userJoin.username = userJoin.username + RandomGenerator.alphabets(3);
  }

  // Ensure username meets maximum length requirement of 21 characters
  if (userJoin.username.length > 21) {
    userJoin.username = userJoin.username.substring(0, 21);
  }

  const joinedUser: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(joinedUser);

  // Attempt to retrieve moderator information for a non-existent community
  // Using random UUIDs for both communityId and moderatorId since neither exist
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();

  // This should fail with an appropriate error since the community doesn't exist
  await TestValidator.error(
    "should fail when retrieving moderator from non-existent community",
    async () => {
      await api.functional.communityForum.communities.moderators.at(
        connection,
        {
          communityId: nonExistentCommunityId,
          moderatorId: nonExistentModeratorId,
        },
      );
    },
  );
}
