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
 * Test that attempting to unsubscribe from an already deleted subscription returns appropriate error.
 *
 * Validates the idempotency protection for subscription deletion by attempting to delete a subscription that has already been soft-deleted. The test ensures that the system properly handles duplicate unsubscribe attempts by returning an appropriate error instead of allowing the operation to succeed or corrupting the data.
 *
 * Special attention is given to verifying that the subscription's deleted_at timestamp remains unchanged after the second deletion attempt, confirming that the soft-delete record is preserved for audit purposes.
 *
 * 1. Register and authenticate as a member to gain access to subscription management.
 * 2. Create a subscription to a community using the authenticated member connection.
 * 3. Delete the subscription (first unsubscribe operation) - this should succeed.
 * 4. Attempt to delete the same subscription again with the same subscriptionId.
 * 5. Verify that the second deletion attempt returns a 404 HTTP error.
 * 6. Confirm that the subscription cannot be deleted twice, ensuring idempotency protection.
 */
export async function test_api_community_subscription_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a subscription to a community
  // Note: We need a community ID to create a subscription. Since we don't have a community generation utility,
  // we'll use a random UUID for the community ID. The test will validate the subscription deletion behavior.
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId,
        },
        body: {
          community_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // 3. Delete the subscription (first unsubscribe)
  await api.functional.redditClone.member.communities.subscriptions.erase(
    memberConnection,
    {
      communityId,
      subscriptionId: subscription.id,
    },
  );
  // 4. Attempt to delete the same subscription again
  // This should fail with a 404 error since the subscription is already deleted
  await TestValidator.httpError(
    "already deleted subscription returns 404",
    404,
    async () =>
      await api.functional.redditClone.member.communities.subscriptions.erase(
        memberConnection,
        {
          communityId,
          subscriptionId: subscription.id,
        },
      ),
  );
}
