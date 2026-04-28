import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";

/**
 * Test community subscription retrieval workflow with active membership validation.
 *
 * Validates the complete flow of member registration, community creation, subscription establishment, and subscription retrieval by ID. Ensures that the retrieved subscription contains correct member reference, community reference, active status (is_active = true), join timestamp, and audit timestamps.
 *
 * Tests the business logic of community subscription management including proper relational field population and status tracking for active memberships.
 *
 * 1. Register and authenticate a new member.
 * 2. Create a community with the authenticated member as creator.
 * 3. Subscribe the member to the created community.
 * 4. Retrieve the subscription by its unique ID.
 * 5. Validates subscription details including member reference, community reference, active status, join timestamp, and audit timestamps.
 */
export async function test_api_community_subscription_retrieve_active(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IREdditLikeCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberBody });
  // 2. Create a community with the authenticated member as creator
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the created community
  const subscriptionBody = {
    community_id: community.id,
  } satisfies IRedditLikeCommunityCommunitySubscription.ICreate;
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);
  // 4. Retrieve the subscription by its unique ID
  const retrievedSubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.at(
      memberConnection,
      { subscriptionId: subscription.id },
    );
  typia.assert(retrievedSubscription);
  // 5. Validate subscription details
  TestValidator.equals(
    "member matches",
    retrievedSubscription.member.id,
    subscription.member.id,
  );
  TestValidator.equals(
    "community matches",
    retrievedSubscription.community.id,
    subscription.community.id,
  );
  TestValidator.equals("active status", retrievedSubscription.is_active, true);
  TestValidator.equals(
    "join timestamp matches",
    retrievedSubscription.joined_at,
    subscription.joined_at,
  );
  TestValidator.equals(
    "created timestamp matches",
    retrievedSubscription.created_at,
    subscription.created_at,
  );
  TestValidator.equals(
    "updated timestamp matches",
    retrievedSubscription.updated_at,
    subscription.updated_at,
  );
}
