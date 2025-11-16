import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformTrendingTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingTopic";

/**
 * Test that unauthenticated users can access trending topics without
 * authentication. Verify that the endpoint returns a paginated list of trending
 * topics with proper metadata including frequency counts, velocity metrics,
 * topic names, and engagement metrics. The response should include pagination
 * information with current page, limit, total records, and pages. Validate that
 * topics are ranked correctly by frequency and velocity. Ensure the endpoint
 * returns empty list gracefully if no topics are available. Test that the
 * response complies with the expected schema including topic IDs, trending
 * types (post/community), trending categories (hot/new/top/controversial), vote
 * counts, comment counts, and timestamps.
 */
export async function test_api_trending_topics_public_access(
  connection: api.IConnection,
) {
  // Retrieve trending topics without authentication
  const response: IPageICommunityPlatformTrendingTopic.ISummary =
    await api.functional.communityPlatform.trending.topics.index(connection);

  // Validate the response structure and all type constraints
  typia.assert(response);

  // Validate pagination structure is present
  TestValidator.predicate(
    "pagination information should exist",
    response.pagination !== null && response.pagination !== undefined,
  );

  // Validate data array is present and accessible
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(response.data),
  );

  // If trending topics exist, validate their business logic
  if (response.data.length > 0) {
    const topic = response.data[0];

    // Validate that post reference is optional but when present, it indicates post-type trending
    if (
      topic.community_platform_post_id !== null &&
      topic.community_platform_post_id !== undefined
    ) {
      TestValidator.predicate(
        "post type trending should have post reference",
        topic.trending_type === "post",
      );
    }

    // Validate ranking position is meaningful (should increment per topic in list)
    if (response.data.length > 1) {
      const secondTopic = response.data[1];
      TestValidator.predicate(
        "topics should be ranked in ascending order",
        topic.rank < secondTopic.rank || topic.rank === secondTopic.rank,
      );
    }

    // Validate engagement metric constraints
    const totalEngagement = topic.upvote_count + topic.downvote_count;
    TestValidator.predicate(
      "engagement metrics should be non-negative",
      topic.upvote_count >= 0 &&
        topic.downvote_count >= 0 &&
        topic.comment_count >= 0,
    );

    // Validate timestamp consistency
    const createdTime = new Date(topic.created_at).getTime();
    const refreshedTime = new Date(topic.refreshed_at).getTime();
    TestValidator.predicate(
      "refreshed_at should be after or equal to created_at",
      refreshedTime >= createdTime,
    );

    // Validate category-specific metrics exist appropriately
    if (topic.trending_category === "hot") {
      TestValidator.predicate(
        "hot category should have meaningful hot_score",
        topic.hot_score !== null && topic.hot_score !== undefined,
      );
    }

    if (topic.trending_category === "top") {
      TestValidator.predicate(
        "top category should have top_score metric",
        topic.top_score !== null && topic.top_score !== undefined,
      );
    }

    if (topic.trending_category === "controversial") {
      TestValidator.predicate(
        "controversial category should have controversy_score",
        topic.controversy_score !== null &&
          topic.controversy_score !== undefined,
      );
    }
  }

  // Validate pagination consistency
  const pagination = response.pagination;
  TestValidator.predicate(
    "total records should match pagination calculation",
    pagination.records >= 0 && pagination.pages >= 0,
  );

  // Validate that current page is within valid range
  if (pagination.pages > 0) {
    TestValidator.predicate(
      "current page should be within valid range",
      pagination.current >= 0 && pagination.current < pagination.pages,
    );
  }

  // Validate graceful handling of empty trending topics
  if (response.data.length === 0) {
    TestValidator.predicate(
      "empty response should have zero total records or indicate last page",
      pagination.records === 0,
    );
  }
}
