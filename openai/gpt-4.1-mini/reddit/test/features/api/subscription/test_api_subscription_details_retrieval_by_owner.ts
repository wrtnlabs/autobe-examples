import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_subscription_details_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. User registration
  const userEmail = typia.random<string & tags.Format<"email">>();
  const newUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: "TestPassword123!",
        href: "https://test.example.com/home",
        referrer: "https://test.example.com/landing",
      } satisfies IRedditCommunityUser.ICreate,
    });
  typia.assert(newUser);

  // 2. Verify user subscriptions
  TestValidator.predicate(
    "user has subscriptions array",
    Array.isArray(newUser.reddit_community_subscriptions),
  );
  if (
    !newUser.reddit_community_subscriptions ||
    newUser.reddit_community_subscriptions.length === 0
  ) {
    // No subscriptions available, test cannot proceed as no scenario for creation
    return;
  }
  const subscription = newUser.reddit_community_subscriptions[0];

  // 3. For communityName, generate a plausible string (e.g., using RandomGenerator)
  const communityName = RandomGenerator.name(2)
    .replace(/\s+/g, "_")
    .toLowerCase();

  // 4. Retrieve subscription details
  const retrievedSubscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.user.communities.subscriptions.at(
      connection,
      {
        communityName: communityName,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);

  // 5. Validate the retrieved subscription
  TestValidator.equals(
    "subscription id matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription user id matches",
    retrievedSubscription.reddit_community_user_id,
    newUser.id,
  );
  TestValidator.equals(
    "subscription community id matches",
    retrievedSubscription.reddit_community_community_id,
    subscription.reddit_community_community_id,
  );
  TestValidator.predicate(
    "subscription created_at is non-empty string",
    typeof retrievedSubscription.created_at === "string" &&
      retrievedSubscription.created_at.length > 0,
  );
  TestValidator.predicate(
    "subscription updated_at is non-empty string",
    typeof retrievedSubscription.updated_at === "string" &&
      retrievedSubscription.updated_at.length > 0,
  );
}
