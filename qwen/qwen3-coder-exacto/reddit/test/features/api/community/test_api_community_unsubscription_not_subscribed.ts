import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_unsubscription_not_subscribed(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const userJoin = {
    email: `${RandomGenerator.alphabets(10)}@example.com`,
    password: "password123",
    username: RandomGenerator.alphabets(8),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoin,
    });
  typia.assert(user);

  // Step 2: Create a new community
  const communityCreate = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphabets(10),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    rules: RandomGenerator.paragraph({ sentences: 3 }),
    privacy_level: "public",
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreate,
    });
  typia.assert(community);

  // Step 3: Attempt to unsubscribe from the community without subscribing first
  await TestValidator.error(
    "should fail to unsubscribe when not subscribed",
    async () => {
      await api.functional.communityForum.user.communities.subscriptions.erase(
        connection,
        {
          communitySlug: community.slug,
        },
      );
    },
  );
}
