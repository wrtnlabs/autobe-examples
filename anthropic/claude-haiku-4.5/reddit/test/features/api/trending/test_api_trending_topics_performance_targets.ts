import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformTrendingTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTrendingTopic";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTrendingTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTrendingTopic";

export async function test_api_trending_topics_performance_targets(
  connection: api.IConnection,
) {
  // Test 1: Verify first response completes within 800ms performance target
  const startTime1 = Date.now();
  const response1: IPageICommunityPlatformTrendingTopic.ISummary =
    await api.functional.communityPlatform.trending.topics.index(connection);
  const endTime1 = Date.now();
  const duration1 = endTime1 - startTime1;

  typia.assert(response1);
  TestValidator.predicate(
    "first request completes within 800ms",
    duration1 <= 800,
  );
  TestValidator.predicate(
    "response has pagination data",
    response1.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has trending topics data",
    response1.data !== undefined,
  );

  // Test 2: Verify pagination structure
  TestValidator.predicate(
    "pagination current is non-negative integer",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    response1.pagination.pages >= 0,
  );

  // Test 3: Multiple sequential requests maintain consistent performance
  const performanceMeasurements: number[] = [duration1];
  const topicIds: string[] = response1.data.map((t) => t.id);

  for (let i = 0; i < 2; i++) {
    const startTime = Date.now();
    const response: IPageICommunityPlatformTrendingTopic.ISummary =
      await api.functional.communityPlatform.trending.topics.index(connection);
    const endTime = Date.now();
    const duration = endTime - startTime;

    typia.assert(response);
    performanceMeasurements.push(duration);
    TestValidator.predicate(
      `request ${i + 2} completes within 800ms`,
      duration <= 800,
    );

    // Verify cached data consistency by comparing topic IDs and order
    const currentTopicIds = response.data.map((t) => t.id);
    TestValidator.equals(
      `cached data maintains consistent topic count for request ${i + 2}`,
      topicIds.length,
      currentTopicIds.length,
    );

    // Verify ranking order is preserved when data exists
    if (topicIds.length > 0 && currentTopicIds.length > 0) {
      TestValidator.equals(
        `cached data maintains same top trending topic for request ${i + 2}`,
        topicIds[0],
        currentTopicIds[0],
      );
    }
  }

  // Verify consistent performance across all requests
  const avgPerformance =
    performanceMeasurements.reduce((a, b) => a + b, 0) /
    performanceMeasurements.length;
  TestValidator.predicate(
    "average performance across multiple requests is under 800ms",
    avgPerformance <= 800,
  );

  // Test 4: Validate trending topic structure and data
  if (response1.data.length > 0) {
    const topic = response1.data[0];

    // Validate required UUID fields
    TestValidator.predicate(
      "topic has valid uuid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        topic.id,
      ),
    );
    TestValidator.predicate(
      "topic has valid community_platform_community_id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        topic.community_platform_community_id,
      ),
    );

    // Validate trending type enum
    const validTrendingTypes = ["post", "community"];
    TestValidator.predicate(
      "topic trending_type is valid enum value",
      validTrendingTypes.includes(topic.trending_type),
    );

    // Validate trending category enum
    const validTrendingCategories = ["hot", "new", "top", "controversial"];
    TestValidator.predicate(
      "topic trending_category is valid enum value",
      validTrendingCategories.includes(topic.trending_category),
    );

    // Validate engagement metrics are non-negative integers
    TestValidator.predicate(
      "topic upvote_count is non-negative integer",
      Number.isInteger(topic.upvote_count) && topic.upvote_count >= 0,
    );
    TestValidator.predicate(
      "topic downvote_count is non-negative integer",
      Number.isInteger(topic.downvote_count) && topic.downvote_count >= 0,
    );
    TestValidator.predicate(
      "topic comment_count is non-negative integer",
      Number.isInteger(topic.comment_count) && topic.comment_count >= 0,
    );
    TestValidator.predicate(
      "topic subscriber_count is non-negative integer",
      Number.isInteger(topic.subscriber_count) && topic.subscriber_count >= 0,
    );
    TestValidator.predicate(
      "topic rank is positive integer",
      Number.isInteger(topic.rank) && topic.rank > 0,
    );

    // Validate timestamps are valid ISO 8601 date-time format
    TestValidator.predicate(
      "topic created_at is valid ISO 8601 timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(topic.created_at),
    );
    TestValidator.predicate(
      "topic refreshed_at is valid ISO 8601 timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(topic.refreshed_at),
    );
  }
}
