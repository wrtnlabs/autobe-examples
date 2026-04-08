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
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test the primary success path for member community subscription creation.
 *
 * Validates the complete subscription workflow including member registration, community ID
 * retrieval, and successful subscription creation. Ensures that the subscription entity
 * contains all required fields with correct data types and that the relationship between
 * member and community is properly established.
 *
 * Special attention is given to verifying that the subscription status is set to 'active'
 * upon creation, that the member and community references are correctly resolved, and that
 * all timestamps are in valid ISO 8601 format.
 *
 * 1. Member registers and authenticates using POST /redditCommunity/auth/member/join
 * 2. Obtain a valid community ID (pre-created in test environment)
 * 3. Member subscribes to community using POST /redditCommunity/member/subscriptions
 * 4. Validate subscription response contains all required fields and correct data types
 */
export async function test_api_member_subscription_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. Obtain valid community ID (pre-created in test environment)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create subscription using utility function
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // 4. Validate subscription response
  TestValidator.equals(
    "subscription status is active",
    subscription.status,
    "active",
  );
  TestValidator.equals(
    "subscription ID exists",
    subscription.id !== undefined,
    true,
  );
  TestValidator.equals(
    "member username matches",
    subscription.member.username,
    memberAuthorized.username,
  );
  TestValidator.equals(
    "community ID matches",
    subscription.community.id,
    communityId,
  );
  TestValidator.equals(
    "deleted_at is null for active subscription",
    subscription.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    new Date(subscription.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    new Date(subscription.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "member created_at is valid timestamp",
    new Date(subscription.member.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "member updated_at is valid timestamp",
    new Date(subscription.member.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "community created_at is valid timestamp",
    new Date(subscription.community.created_at).getTime() > 0,
  );
}
