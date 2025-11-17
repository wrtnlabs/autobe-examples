import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import type { ICommunityForumCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunitySubscription";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";

export async function test_api_community_unsubscription_successful(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password123!";
  const userUsername =
    RandomGenerator.name(1).replace(/\s+/g, "_").toLowerCase() +
    "_" +
    RandomGenerator.alphaNumeric(5);

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
  const communityName =
    RandomGenerator.name(3).replace(/\s+/g, "-").toLowerCase() +
    "-" +
    RandomGenerator.alphaNumeric(5);
  const communitySlug = communityName;

  const community: ICommunityForumCommunityGroup =
    await api.functional.communityForum.user.communities.create(connection, {
      body: {
        name: communityName,
        slug: communitySlug,
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        rules: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_level: "public",
        status: "active",
      } satisfies ICommunityForumCommunityGroup.ICreate,
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

  // 4. Unsubscribe from the community
  const unsubscription: ICommunityForumCommunitySubscription =
    await api.functional.communityForum.user.communities.subscriptions.erase(
      connection,
      {
        communitySlug: community.slug,
      },
    );
  typia.assert(unsubscription);

  // Validate that the unsubscription was successful
  TestValidator.equals(
    "unsubscribed community ID matches subscribed community ID",
    subscription.communityForumCommunityId,
    unsubscription.communityForumCommunityId,
  );

  TestValidator.equals(
    "unsubscribed user ID matches subscribing user ID",
    subscription.communityForumUserId,
    unsubscription.communityForumUserId,
  );
}
