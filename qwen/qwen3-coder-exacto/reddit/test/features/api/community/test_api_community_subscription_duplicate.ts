import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_subscription_duplicate(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "_"),
  } satisfies ICommunityForumCommunityUser.IJoin;

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    slug: RandomGenerator.name(2).toLowerCase().replace(/\s+/g, "-"),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    rules: RandomGenerator.content({ paragraphs: 1 }),
    privacy_level: RandomGenerator.pick([
      "public",
      "private",
      "restricted",
    ] as const),
    status: "active",
  } satisfies ICommunityForumCommunityGroup.ICreate;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(community);

  // 3. Subscribe to the community
  const subscription: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(subscription);

  // 4. Attempt to subscribe again to the same community
  await TestValidator.error("duplicate subscription should fail", async () => {
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  });
}
