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

export async function test_api_subscriptions_retrieval_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. User registration via /auth/user/join for authorization
  const joinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://www.example.com/signup",
    referrer: "https://www.example-referrer.com",
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(authorizedUser);

  // 2. Use authorized session automatically handled by SDK to request subscriptions
  const communityName = "example-community";

  const subscriptionRequestBody = {
    page: 1,
    limit: 10,
    sort_by: "created_at",
    order: "desc",
    search: "",
  } satisfies IRedditCommunitySubscription.IRequest;

  const subscriptionsPage: IPageIRedditCommunitySubscription.ISummary =
    await api.functional.redditCommunity.user.communities.subscriptions.index(
      connection,
      {
        communityName: communityName,
        body: subscriptionRequestBody,
      },
    );
  typia.assert(subscriptionsPage);

  TestValidator.predicate(
    "pagination has valid current page",
    subscriptionsPage.pagination.current === subscriptionRequestBody.page,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    subscriptionsPage.pagination.limit === subscriptionRequestBody.limit,
  );

  TestValidator.predicate(
    "subscriptions data array exists",
    Array.isArray(subscriptionsPage.data),
  );
  for (const subscription of subscriptionsPage.data) {
    typia.assert(subscription);
    TestValidator.predicate(
      "subscription has valid id",
      typeof subscription.id === "string" && subscription.id.length > 0,
    );
    TestValidator.predicate(
      "subscription has valid user id",
      typeof subscription.reddit_community_user_id === "string" &&
        subscription.reddit_community_user_id.length > 0,
    );
    TestValidator.predicate(
      "subscription has valid community id",
      typeof subscription.reddit_community_community_id === "string" &&
        subscription.reddit_community_community_id.length > 0,
    );
  }
}
