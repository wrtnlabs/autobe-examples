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
 * Test community statistics retrieval for a member viewing a community with no engagement.
 *
 * Validates the edge case where a member has subscribed to a community but has not created any posts,
 * comments, or votes. The endpoint should correctly return zero counts for all engagement metrics while
 * accurately reflecting the subscriber count.
 *
 * The test verifies that the community statistics endpoint gracefully handles communities with no
 * user engagement data, ensuring that all integer metrics are properly initialized to zero and the
 * response structure matches the expected IRedditCommunityCommunity.IAt schema.
 *
 * 1. Create a member account and authenticate using POST /redditCommunity/auth/member/join.
 * 2. Subscribe the member to an existing community using POST /redditCommunity/member/subscriptions.
 * 3. Verify that no posts, comments, or votes exist in the community (skip creating any).
 * 4. Retrieve community statistics using GET /redditCommunity/member/communities/{communityId}/stats.
 * 5. Validate that subscriber_count is 1, and all engagement metrics (post_count, comment_count,
 *    vote_count) are zero, confirming correct handling of empty engagement data.
 */
export async function test_api_community_stats_empty_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(2),
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  typia.assert(member);
  // 2. Subscribe member to an existing community
  const existingCommunityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: existingCommunityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Retrieve community statistics (no posts/comments/votes created)
  const stats =
    await api.functional.redditCommunity.member.communities.stats.at(
      memberConnection,
      {
        communityId: existingCommunityId,
      },
    );
  typia.assert(stats);
  // 4. Validate empty engagement metrics
  TestValidator.equals("subscriber count is 1", stats.subscriber_count, 1);
  TestValidator.equals("post count is 0", stats.post_count, 0);
  TestValidator.equals("comment count is 0", stats.comment_count, 0);
  TestValidator.equals("vote count is 0", stats.vote_count, 0);
  // 5. Validate metadata fields
  TestValidator.equals(
    "created_at is valid ISO 8601 timestamp",
    typeof stats.created_at,
    "string",
  );
  TestValidator.equals("name is present", typeof stats.name, "string");
}
