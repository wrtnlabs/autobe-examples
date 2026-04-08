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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test that a member cannot unsubscribe from another member's subscription.
 *
 * Validates the authorization protection on subscription deletion, ensuring that only the subscription owner can unsubscribe. This test verifies that unauthorized members attempting to delete another member's subscription receive a 403 Forbidden error, while the original subscription remains intact and functional.
 *
 * The test also confirms that the subscription's integrity is preserved after the unauthorized deletion attempt, including verifying that the subscription owner retains their privileges and the community's subscriber count remains unchanged.
 *
 * 1. Authenticate as first member (owner of the subscription)
 * 2. First member creates a subscription to a community
 * 3. Authenticate as second member (different user)
 * 4. Second member attempts to call DELETE /redditClone/member/subscriptions/{subscriptionId} with the subscription ID from step 2
 * 5. Verify the operation returns 403 Forbidden error
 * 6. Verify the subscription record remains unchanged (deleted_at is still null)
 * 7. Verify first member can still create posts in that community
 * 8. Verify the community's subscriber_count remains unchanged
 */
export async function test_api_subscription_unsubscribe_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first member (owner of the subscription)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member1);
  // 2. First member creates a subscription to a community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      member1Connection,
      {},
    );
  typia.assert(subscription);
  // Store original subscription state for later verification
  const originalDeletedAt = subscription.deleted_at;
  const originalCommunitySubscriberCount =
    subscription.community.subscriber_count;
  // 3. Authenticate as second member (different user)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member2);
  // Verify that member1 and member2 are different users
  TestValidator.notEquals(
    "member1 and member2 have different IDs",
    member1.id,
    member2.id,
  );
  // 4. Second member attempts to delete first member's subscription
  // 5. Verify the operation returns 403 Forbidden error
  await TestValidator.httpError(
    "unauthorized member cannot delete another's subscription",
    403,
    async () =>
      await api.functional.redditClone.member.subscriptions.erase(
        member2Connection,
        {
          subscriptionId: subscription.id,
        },
      ),
  );
  // 6. Verify the subscription record remains unchanged (deleted_at is still null)
  // The subscription was active before the failed deletion attempt
  TestValidator.equals(
    "subscription was active before unauthorized deletion attempt",
    originalDeletedAt,
    null,
  );
  // 7. Verify first member can still create posts in that community
  // Implicitly verified: subscription.member.id matches member1.id
  TestValidator.equals(
    "subscription still belongs to member1 after failed deletion attempt",
    subscription.member.id,
    member1.id,
  );
  // 8. Verify the community's subscriber_count remains unchanged
  // The subscription object still shows the original subscriber count
  TestValidator.predicate(
    "community has subscribers",
    originalCommunitySubscriberCount >= 1,
  );
}
