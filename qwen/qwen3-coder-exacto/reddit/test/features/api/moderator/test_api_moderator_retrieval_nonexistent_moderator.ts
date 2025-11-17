import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_moderator_retrieval_nonexistent_moderator(
  connection: api.IConnection,
) {
  // First, authenticate as a regular user
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.name(1),
    } satisfies ICommunityForumCommunityUser.IJoin,
  });
  typia.assert(userJoin);

  // Create a community
  const community = await api.functional.communityForum.user.communities.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphabets(10),
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    },
  );
  typia.assert(community);

  // Try to retrieve a non-existent moderator
  const fakeModeratorId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail to retrieve non-existent moderator",
    async () => {
      await api.functional.communityForum.communities.moderators.at(
        connection,
        {
          communityId: community.id,
          moderatorId: fakeModeratorId,
        },
      );
    },
  );
}
