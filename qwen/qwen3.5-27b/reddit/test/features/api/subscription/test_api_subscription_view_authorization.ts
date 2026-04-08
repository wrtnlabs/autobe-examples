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
 * Test subscription view authorization ensuring members can only access their own subscriptions.
 *
 * Validates the authorization boundary for subscription retrieval operations. The test creates two separate member accounts, establishes a subscription for the first member, then verifies that the second member cannot access the first member's subscription data. This ensures proper ownership-based access control prevents unauthorized cross-user subscription viewing.
 *
 * Special attention is given to verifying that the system enforces strict authorization checks when retrieving subscription details, returning appropriate errors when users attempt to access subscriptions they do not own.
 *
 * 1. Authenticate first member with unique credentials and create their connection.
 * 2. Authenticate second member with different credentials and create their connection.
 * 3. First member creates a subscription to a community (using a generated community ID for testing).
 * 4. Second member attempts to retrieve first member's subscription using the same communityId and subscriptionId.
 * 5. Verify system returns an error (404 or 403) indicating the subscription is not accessible.
 * 6. Confirm that ownership-based access control prevents cross-user subscription viewing.
 */
export async function test_api_subscription_view_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IRedditCloneMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member1);
  // 2. Authenticate second member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: IRedditCloneMember.IAuthorized = await authorize_member_join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member2);
  // 3. Generate a community ID for testing (simulated)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. First member creates a subscription to the community
  const subscription: IRedditCloneCommunitySubscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      member1Connection,
      {
        params: {
          communityId,
        },
        body: {
          community_id: communityId,
        } satisfies IRedditCloneCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 5. Second member attempts to retrieve first member's subscription
  // This should fail with 404 (not found) or 403 (forbidden)
  await TestValidator.httpError(
    "second member cannot access first member's subscription",
    [403, 404],
    async () => {
      await api.functional.redditClone.communities.subscriptions.at(
        member2Connection,
        {
          communityId: subscription.community.id,
          subscriptionId: subscription.id,
        },
      );
    },
  );
  // 6. Verify that first member can access their own subscription
  const retrievedSubscription: IRedditCloneCommunitySubscription =
    await api.functional.redditClone.communities.subscriptions.at(
      member1Connection,
      {
        communityId: subscription.community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 7. Validate that the retrieved subscription matches the original
  TestValidator.equals(
    "subscription matches original",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member ID matches first member",
    retrievedSubscription.member.id,
    member1.id,
  );
}