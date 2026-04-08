import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test successful community subscription cancellation workflow.
 *
 * Validates the complete unsubscribe flow including member registration, community creation, subscription establishment, and subscription cancellation. Ensures that the unsubscribe operation executes successfully and returns the expected 204 No Content response.
 *
 * The test verifies that: (1) a member can successfully register and authenticate, (2) a community can be created by the member, (3) the member can subscribe to the community, (4) the unsubscribe operation completes without error, and (5) the operation returns void indicating successful soft-delete of the subscription.
 *
 * Note: Verification of deletedAt timestamp and subscriber_count decrement requires GET endpoints which are not available in the current API function set. The test validates the successful execution of the unsubscribe workflow with available operations.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Create a community owned by the registered member.
 * 3. Subscribe the member to the created community.
 * 4. Record the initial subscriber count from the created community.
 * 5. Call the unsubscribe endpoint with the subscription ID.
 * 6. Validate the operation completes successfully (returns void).
 */
export async function test_api_subscription_unsubscribe_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Record initial subscriber count for reference
  const initialSubscriberCount = community.subscriber_count;
  TestValidator.predicate(
    "community has at least one subscriber after subscription",
    initialSubscriberCount >= 1,
  );
  // 4. Unsubscribe from community (returns void for 204 No Content)
  await api.functional.redditCommunity.member.member.subscriptions.erase(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  // 5. Test completes successfully - erase returned void without throwing
  // Note: Cannot verify deletedAt or subscriber_count changes without GET endpoints
  // The successful completion of erase() validates the unsubscribe workflow
}
