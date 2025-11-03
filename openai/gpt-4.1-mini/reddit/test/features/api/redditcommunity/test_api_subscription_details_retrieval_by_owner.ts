import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
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
  // 1. Register a new user and obtain authorization token
  const userCreateBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password: "correcthorsebatterystaple",
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(authorizedUser);

  // 2. Use the authorized connection to retrieve the user's subscriptions of a community
  // For testing, choose a communityName string randomly
  const testCommunityName = "test-community";

  // Request body satisfies pagination and filtering properties
  const subscriptionRequestBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "desc",
  } satisfies IRedditCommunitySubscription.IRequest;

  const subscriptionsPage: IPageIRedditCommunitySubscription.ISummary =
    await api.functional.redditCommunity.user.communities.subscriptions.index(
      connection,
      {
        communityName: testCommunityName,
        body: subscriptionRequestBody,
      },
    );
  typia.assert(subscriptionsPage);

  TestValidator.predicate(
    "subscriptions data is not empty",
    !!subscriptionsPage.data.length,
  );

  // 3. Verify all the subscriptions belong to the authorized user
  subscriptionsPage.data.forEach((subscription) => {
    TestValidator.equals(
      "subscription belongs to authorized user",
      subscription.reddit_community_user_id,
      authorizedUser.id,
    );
  });
}
