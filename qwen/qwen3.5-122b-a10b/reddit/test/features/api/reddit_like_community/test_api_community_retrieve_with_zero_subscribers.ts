import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test community retrieval with zero subscribers.
 *
 * Validates that the community retrieval endpoint correctly handles the edge case of a community with no active subscriptions. After creating a new community, the test immediately retrieves its details without any subscriptions being created, ensuring the subscriber_count field accurately reflects 0.
 *
 * This test verifies that the subscriber count aggregation query works correctly even when there are no subscription records to count, and that all other community fields are properly populated in the response.
 *
 * 1. Authenticate as a member using the join utility function.
 * 2. Create a new community with unique name and optional description.
 * 3. Immediately retrieve the community details without creating any subscriptions.
 * 4. Validate that subscriber_count equals 0.
 * 5. Validate that all other community fields (id, name, owner, created_at, etc.) are present and valid.
 */
export async function test_api_community_retrieve_with_zero_subscribers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Retrieve community details immediately (without any subscriptions)
  const retrieved = await api.functional.redditLike.member.communities.at(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate subscriber_count is 0 (primary business logic test)
  TestValidator.equals(
    "subscriber count is zero",
    retrieved.subscriber_count,
    0,
  );
  // 5. Validate community identity fields match
  TestValidator.equals("community id matches", retrieved.id, community.id);
  TestValidator.equals(
    "community name matches",
    retrieved.name,
    community.name,
  );
  // 6. Validate description is preserved from creation
  TestValidator.equals(
    "description matches",
    retrieved.description,
    community.description,
  );
  // 7. Validate owner reference is present with required fields
  TestValidator.predicate(
    "owner has valid id",
    retrieved.owner.id !== null && retrieved.owner.id !== undefined,
  );
  TestValidator.predicate(
    "owner has valid username",
    retrieved.owner.username !== null && retrieved.owner.username !== undefined,
  );
  TestValidator.predicate(
    "owner has valid karma_score",
    retrieved.owner.karma_score !== null &&
      retrieved.owner.karma_score !== undefined,
  );
  TestValidator.predicate(
    "owner has valid created_at",
    retrieved.owner.created_at !== null &&
      retrieved.owner.created_at !== undefined,
  );
}
