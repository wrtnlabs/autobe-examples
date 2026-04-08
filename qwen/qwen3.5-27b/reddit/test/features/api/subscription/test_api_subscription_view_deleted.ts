import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test that viewing a soft-deleted subscription returns 404 error.
 *
 * Validates the complete subscription lifecycle including creation, deletion, and access control for deleted subscriptions. Ensures that once a subscription is soft-deleted (unsubscribed), attempting to retrieve it returns a 404 error, maintaining the business rule that unsubscribed users cannot view their subscription details.
 *
 * Special attention is given to verifying that the subscription ID and community ID remain valid references, but the soft-delete status prevents access through the GET endpoint.
 *
 * 1. Authenticate a new member account via join endpoint.
 * 2. Create a subscription linking the member to an existing community.
 * 3. Delete (unsubscribe) the subscription using the erase endpoint.
 * 4. Attempt to retrieve the deleted subscription using the same communityId and subscriptionId.
 * 5. Verify the system returns 404 error indicating the subscription is not accessible.
 *
 * Note: This test assumes a valid community exists in the test database with the specified communityId.
 */
export async function test_api_subscription_view_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a subscription to an existing community
  // Using a test community ID that should exist in the test database
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId,
        },
      },
    );
  typia.assert(subscription);
  // 3. Delete (unsubscribe) the subscription
  await api.functional.redditClone.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId,
      subscriptionId: subscription.id,
    },
  );
  // 4. Attempt to retrieve the deleted subscription - should return 404
  await TestValidator.httpError(
    "deleted subscription returns 404",
    404,
    async () =>
      await api.functional.redditClone.communities.subscriptions.at(
        memberConnection,
        {
          communityId,
          subscriptionId: subscription.id,
        },
      ),
  );
}
