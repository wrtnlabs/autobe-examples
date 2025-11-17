import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_delete_nonexistent(
  connection: api.IConnection,
) {
  // Step 1: Create a user via join to get authentication
  const userJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
    username: RandomGenerator.name(1),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userJoinData,
  });
  typia.assert(authorizedUser);

  // Step 2: Attempt to delete a non-existent community with a random slug
  const randomCommunitySlug = RandomGenerator.alphabets(10);

  // Step 3: Validate that proper error response is returned
  await TestValidator.error(
    "deleting non-existent community should fail",
    async () => {
      await api.functional.communityForum.user.communities.erase(connection, {
        communitySlug: randomCommunitySlug,
      });
    },
  );
}
