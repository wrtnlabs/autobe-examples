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

/**
 * Test to validate that a user can register and then successfully create a
 * subscription to a specific community.
 *
 * Process:
 *
 * 1. User registers via /auth/user/join with email, password, and session
 *    information.
 * 2. The returned token authenticates further requests.
 * 3. The user creates a subscription to a community by its unique name, including
 *    session connection metadata.
 * 4. The test asserts the subscription response matches the communityName and
 *    userId, and uses typia.assert for type safety.
 */
export async function test_api_subscription_creation_by_user(
  connection: api.IConnection,
) {
  // 1. User registration (join)
  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });

  typia.assert(authorizedUser);

  // 2. Prepare subscription creation body
  const subscriptionCreateBody = {
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
    ip: null,
    reddit_community_community_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunitySubscription.ICreate;

  // 3. Create a subscription to a specific community by its unique name
  const communityName = `community-${RandomGenerator.alphaNumeric(6)}`;

  const subscription: IRedditCommunitySubscription =
    await api.functional.redditCommunity.user.communities.subscriptions.createSubscription(
      connection,
      {
        communityName: communityName,
        body: subscriptionCreateBody,
      },
    );

  typia.assert(subscription);

  // 4. Assert subscription data
  TestValidator.equals(
    "subscription community id matches request",
    subscription.reddit_community_community_id,
    subscriptionCreateBody.reddit_community_community_id,
  );

  TestValidator.equals(
    "subscription user id matches authorized user",
    subscription.reddit_community_user_id,
    authorizedUser.id,
  );
}
