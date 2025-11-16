import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";

export async function test_api_reddit_community_subscription_creation_by_registered_user(
  connection: api.IConnection,
) {
  // 1. Perform user registration (join) as a registeredUser
  const joinBody = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com",
  } satisfies IRedditCommunityRegisteredUser.IJoin;

  const registeredUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(registeredUser);

  // 2. Create a new Reddit community
  const communityBody = {
    communityName: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IRedditCommunityCommunity.ICreate;

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription of the registered user to the community
  const subscriptionBody = {
    redditCommunity_community_id: community.id,
  } satisfies IRedditCommunitySubscription.ICreate;

  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunitySubscriptions.create(
      connection,
      {
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  // 4. Validate that subscription links correct community and user summaries
  TestValidator.equals(
    "subscription community id",
    subscription.community.id,
    community.id,
  );

  TestValidator.equals(
    "subscription user id",
    subscription.registeredUser.id,
    registeredUser.id,
  );

  TestValidator.predicate(
    "subscription has created_at timestamp",
    typeof subscription.created_at === "string" &&
      subscription.created_at.length > 0,
  );

  TestValidator.predicate(
    "subscription has valid uuid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      subscription.id,
    ),
  );
}
