import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_subscription_unsubscribe_by_user(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const createUserBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com",
    ip: null,
  } satisfies IRedditCommunityUser.ICreate;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: createUserBody,
  });
  typia.assert(authorizedUser);

  // 2. Create a new community
  const communityCreateBody = {
    name: RandomGenerator.name(1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityCommunity.ICreate;

  const createdCommunity =
    await api.functional.redditCommunity.user.communities.create(connection, {
      body: communityCreateBody,
    });
  typia.assert(createdCommunity);

  // 3. Subscribe the user to the community
  const subscriptionCreateBody = {
    href: "https://example.com/community",
    referrer: "https://example.com",
    ip: null,
    reddit_community_community_id: createdCommunity.id,
  } satisfies IRedditCommunitySubscription.ICreate;

  const subscription =
    await api.functional.redditCommunity.user.communities.subscriptions.createSubscription(
      connection,
      {
        communityName: createdCommunity.name,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 4. Verify subscription exists for the user
  TestValidator.predicate(
    "subscription exists for user after creation",
    () => subscription !== null && subscription !== undefined,
  );

  // 5. Unsubscribe by deleting the subscription
  await api.functional.redditCommunity.user.communities.subscriptions.erase(
    connection,
    {
      communityName: createdCommunity.name,
      subscriptionId: subscription.id,
    },
  );

  // 6. Verify repeated deletion causes an error
  await TestValidator.error("repeat unsubscribe should fail", async () => {
    await api.functional.redditCommunity.user.communities.subscriptions.erase(
      connection,
      {
        communityName: createdCommunity.name,
        subscriptionId: subscription.id,
      },
    );
  });
}
