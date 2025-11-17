import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunitySubscription";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

export async function test_api_redditcommunity_registereduser_community_subscription_listing(
  connection: api.IConnection,
) {
  // 1. RegisteredUser account registration for authentication
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRegisteredUser.ICreate;
  const authorizedUser: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new community with unique communityName
  const communityCreateBody = {
    communityName: RandomGenerator.alphabets(10).toLowerCase(),
    displayName: RandomGenerator.name(),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 7,
    }),
    imageUrl: null,
    isPrivate: false,
  } satisfies IRedditCommunityCommunity.ICreate;
  const createdCommunity: IRedditCommunityCommunity =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Create a subscription for the user in the created community
  const subscriptionCreateBody = {
    community_name: communityCreateBody.communityName,
  } satisfies IRedditCommunityCommunitySubscription.ICreate;
  const createdSubscription: IRedditCommunityCommunitySubscription =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.create(
      connection,
      {
        communityName: communityCreateBody.communityName,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(createdSubscription);

  // 4. Perform listing (patch) of community subscriptions with filters and pagination
  const subscriptionListingRequestBody = {
    search: undefined,
    page: 1,
    limit: 20,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IRedditCommunityCommunitySubscription.IRequest;

  const subscriptionList: IPageIRedditCommunityCommunitySubscription.ISummary =
    await api.functional.redditCommunity.registeredUser.redditCommunity.communities.communitySubscriptions.index(
      connection,
      {
        communityName: communityCreateBody.communityName,
        body: subscriptionListingRequestBody,
      },
    );
  typia.assert(subscriptionList);

  // Validate the listing includes the created subscription
  const foundSubscription = subscriptionList.data.find(
    (subscription) => subscription.id === createdSubscription.id,
  );
  typia.assert(foundSubscription);

  TestValidator.predicate(
    "subscription listing includes created subscription",
    foundSubscription !== undefined,
  );
  TestValidator.equals(
    "subscription pagination current page",
    subscriptionList.pagination.current,
    subscriptionListingRequestBody.page,
  );
  TestValidator.equals(
    "subscription pagination limit",
    subscriptionList.pagination.limit,
    subscriptionListingRequestBody.limit,
  );
}
