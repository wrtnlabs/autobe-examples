import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_subscription_successful(
  connection: api.IConnection,
) {
  // 1. Register a new user via join endpoint
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "password123";
  const userUsername = RandomGenerator.name(1);

  const user: ICommunityForumCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        username: userUsername,
      } satisfies ICommunityForumCommunityUser.IJoin,
    });
  typia.assert(user);

  // 2. Create a new community
  const communityName = RandomGenerator.name(2);
  const communitySlug = RandomGenerator.alphabets(10);

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: communityName,
        slug: communitySlug,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
    });
  typia.assert(community);

  // 3. Subscribe to the community using the subscription endpoint
  const subscription: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.create(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(subscription);

  // Validate that the subscription is created successfully
  TestValidator.equals(
    "subscription community ID matches",
    subscription.communityForumCommunityId,
    community.id,
  );

  TestValidator.equals(
    "subscription user ID matches",
    subscription.communityForumUserId,
    user.id,
  );

  TestValidator.predicate(
    "subscription has valid createdAt timestamp",
    () =>
      typeof subscription.createdAt === "string" &&
      subscription.createdAt.length > 0,
  );
}
