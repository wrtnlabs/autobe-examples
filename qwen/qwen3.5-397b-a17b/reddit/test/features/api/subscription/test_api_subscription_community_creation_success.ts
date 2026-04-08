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
 * Test member community subscription creation success path.
 *
 * Validates the complete subscription workflow including member authentication, community creation, and subscription establishment. Ensures that the subscription correctly references both the member and community, and that all response fields are properly populated.
 *
 * The test verifies that subscribing to a community establishes the relationship correctly, with proper member and community summary objects, valid timestamps, and accurate subscriber count increment.
 *
 * 1. Member joins and authenticates to obtain JWT tokens.
 * 2. Authenticated member creates a new community.
 * 3. Member subscribes to the created community using community ID.
 * 4. Validates subscription response contains correct member reference, community reference, createdAt timestamp, null deletedAt, and updated subscriber count.
 */
export async function test_api_subscription_community_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication - Create and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Community Creation - Create a new community owned by the member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscription Creation - Subscribe to the created community
  const subscription =
    await api.functional.redditCommunity.member.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Validate Subscription Response Structure
  TestValidator.equals(
    "subscription member ID matches authenticated member",
    subscription.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "subscription community ID matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription createdAt is valid date-time",
    () => new Date(subscription.createdAt).getTime() > 0,
  );
  TestValidator.equals(
    "subscription deletedAt is null (active)",
    subscription.deletedAt,
    null,
  );
  // 5. Validate Member Summary in Subscription
  TestValidator.equals(
    "member username matches",
    subscription.member.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "member display_name matches",
    subscription.member.display_name,
    memberAuth.display_name,
  );
  // 6. Validate Community Summary in Subscription
  TestValidator.equals(
    "community name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    subscription.community.description,
    community.description,
  );
  TestValidator.predicate(
    "community subscriber count incremented",
    subscription.community.subscribers_count >= 1,
  );
}
