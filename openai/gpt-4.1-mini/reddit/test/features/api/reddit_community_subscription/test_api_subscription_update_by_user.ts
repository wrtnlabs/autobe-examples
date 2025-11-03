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

export async function test_api_subscription_update_by_user(
  connection: api.IConnection,
) {
  // 1. User registration: join to create authenticated user context
  const userCreateBody = {
    email: `user_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "TestPass123!",
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IRedditCommunityUser.ICreate;

  const user: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreateBody });
  typia.assert(user);

  // 2. Create a subscription for the user in a chosen community
  const communityName = "testCommunity";
  const createSubBody = {
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
    ip: null,
    reddit_community_community_id: typia.random<string>(),
  } satisfies IRedditCommunitySubscription.ICreate;

  const createdSub: IRedditCommunitySubscription =
    await api.functional.redditCommunity.user.communities.subscriptions.createSubscription(
      connection,
      { communityName, body: createSubBody },
    );
  typia.assert(createdSub);

  // 3. Update the subscription with new updated_at timestamp
  const newUpdatedAt = new Date().toISOString();
  const updateSubBody = {
    created_at: createdSub.created_at,
    updated_at: newUpdatedAt,
  } satisfies IRedditCommunitySubscription.IUpdate;

  const updatedSub: IRedditCommunitySubscription =
    await api.functional.redditCommunity.user.communities.subscriptions.updateSubscription(
      connection,
      {
        communityName,
        subscriptionId: createdSub.id,
        body: updateSubBody,
      },
    );
  typia.assert(updatedSub);
  TestValidator.equals(
    "subscription id remains the same",
    updatedSub.id,
    createdSub.id,
  );
  TestValidator.equals(
    "subscription created_at remains the same",
    updatedSub.created_at,
    createdSub.created_at,
  );
  TestValidator.equals(
    "subscription updated_at is updated",
    updatedSub.updated_at,
    newUpdatedAt,
  );

  // 4. Test unauthorized update attempt
  // Create a separate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthorized update subscription is rejected",
    async () => {
      await api.functional.redditCommunity.user.communities.subscriptions.updateSubscription(
        unauthConn,
        {
          communityName,
          subscriptionId: createdSub.id,
          body: updateSubBody,
        },
      );
    },
  );
}
