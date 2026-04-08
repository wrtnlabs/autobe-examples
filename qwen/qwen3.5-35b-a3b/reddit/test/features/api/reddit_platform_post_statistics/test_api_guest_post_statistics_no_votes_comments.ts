import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostRecentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostRecentActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_statistics_no_votes_comments(
  connection: api.IConnection,
) {
  // Use a randomly generated post ID for testing
  // Since there's no post creation SDK function, we test the endpoint behavior
  // with a random ID to verify edge case handling
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the statistics endpoint with the generated post ID
  const statistics = await api.functional.redditPlatform.guest.posts.statistics(
    connection,
    {
      postId,
    },
  );
  typia.assert(statistics);
  // Validate that the endpoint returns the expected structure
  TestValidator.equals("post id matches", statistics.id, postId);
  TestValidator.predicate("author exists", statistics.author !== null);
  TestValidator.predicate("community exists", statistics.community !== null);
  TestValidator.predicate(
    "created at is valid",
    statistics.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at is valid",
    statistics.updated_at !== undefined,
  );
  // Validate vote metrics are zero (no votes on this post)
  TestValidator.equals("upvotes count is zero", statistics.upvotes_count, 0);
  TestValidator.equals(
    "downvotes count is zero",
    statistics.downvotes_count,
    0,
  );
  TestValidator.equals("total votes is zero", statistics.total_votes, 0);
  TestValidator.equals("vote ratio is zero", statistics.vote_ratio, 0);
  TestValidator.equals(
    "unique voters count is zero",
    statistics.unique_voters_count,
    0,
  );
  // Validate comment metrics are zero (no comments on this post)
  TestValidator.equals(
    "total comment count is zero",
    statistics.comment_count,
    0,
  );
  TestValidator.equals(
    "root comment count is zero",
    statistics.root_comment_count,
    0,
  );
  TestValidator.equals(
    "reply comment count is zero",
    statistics.reply_comment_count,
    0,
  );
  TestValidator.equals(
    "top comment id is null",
    statistics.top_comment_id,
    null,
  );
  // Validate engagement metrics handle division by zero correctly
  TestValidator.equals(
    "votes per comment ratio is zero",
    statistics.votes_per_comment_ratio,
    0,
  );
  TestValidator.equals(
    "comment density is zero",
    statistics.comment_density,
    0,
  );
  TestValidator.equals(
    "engagement velocity is zero",
    statistics.engagement_velocity,
    0,
  );
  // Validate recent activity metrics are zero
  TestValidator.equals(
    "recent 24h comment count is zero",
    statistics.recent_activity_24h.comment_count,
    0,
  );
  TestValidator.equals(
    "recent 24h vote count is zero",
    statistics.recent_activity_24h.vote_count,
    0,
  );
  TestValidator.equals(
    "recent 24h unique voters is zero",
    statistics.recent_activity_24h.unique_voters_count,
    0,
  );
  TestValidator.equals(
    "recent 7d comment count is zero",
    statistics.recent_activity_7d.comment_count,
    0,
  );
  TestValidator.equals(
    "recent 7d vote count is zero",
    statistics.recent_activity_7d.vote_count,
    0,
  );
  TestValidator.equals(
    "recent 7d unique voters is zero",
    statistics.recent_activity_7d.unique_voters_count,
    0,
  );
}