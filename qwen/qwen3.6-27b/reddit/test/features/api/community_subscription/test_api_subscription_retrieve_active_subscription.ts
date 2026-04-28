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
 * Test retrieving an active community subscription by its unique identifier.
 *
 * Validates the complete subscription retrieval flow including member registration, community creation, subscription establishment, and subscription lookup by ID. Ensures that the retrieved subscription entity contains all expected relational references and status fields are correctly populated.
 *
 * The test verifies that an active subscription (is_active=true, deleted_at=null) returns complete data including the subscribing member summary, the subscribed community summary, and all audit timestamps.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Authenticated member creates a community, becoming its creator.
 * 3. Member subscribes to the created community, generating an active subscription record.
 * 4. Member retrieves the subscription by its ID.
 * 5. Validates subscription ID, member reference, community reference, is_active status, deleted_at null, and joined_at timestamp.
 */
export async function test_api_subscription_retrieve_active_subscription(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create community (member becomes creator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Retrieve subscription by ID
  const retrieved =
    await api.functional.redditLikeCommunity.member.subscriptions.at(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate subscription data
  TestValidator.equals(
    "subscription ID matches creation response",
    retrieved.id,
    subscription.id,
  );
  TestValidator.equals(
    "member ID matches authenticated member",
    retrieved.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "community ID matches created community",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "member username matches authenticated member",
    retrieved.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "member email matches authenticated member",
    retrieved.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "community name matches created community",
    retrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "community subscriber count is at least 1",
    retrieved.community.subscriber_count >= 1,
    true,
  );
  TestValidator.equals("subscription is active", retrieved.is_active, true);
  TestValidator.equals(
    "deleted_at is null for active subscription",
    retrieved.deleted_at,
    null,
  );
  TestValidator.predicate(
    "joined_at is a valid date-time string",
    typeof retrieved.joined_at === "string" && retrieved.joined_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid date-time string",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid date-time string",
    typeof retrieved.updated_at === "string" && retrieved.updated_at.length > 0,
  );
}
