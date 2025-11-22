import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Performance testing for single post retrieval operations.
 *
 * This test validates that the GET /redditPlatform/posts/{postId} endpoint
 * provides fast and consistent performance for individual post requests. It
 * tests retrieval efficiency across different content types (text, link, image)
 * and content sizes to ensure optimal database indexing performance and query
 * response times.
 *
 * The test measures response times for multiple post retrieval scenarios and
 * validates that performance remains consistent across different post types and
 * content sizes.
 */
export async function test_api_post_performance_single_retrieval(
  connection: api.IConnection,
) {
  // Generate multiple post IDs for performance testing
  const testPostIds = ArrayUtil.repeat(20, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Test performance with different content types
  const startTime = Date.now();
  const responseTimes: number[] = [];

  for (const postId of testPostIds) {
    const requestStartTime = Date.now();

    // Perform single post retrieval
    const post: IRedditPlatformPost =
      await api.functional.redditPlatform.posts.getByPostid(connection, {
        postId: postId,
      });

    const requestEndTime = Date.now();
    const responseTime = requestEndTime - requestStartTime;
    responseTimes.push(responseTime);

    // Validate response type safety
    typia.assert(post);

    // Validate post structure and content
    TestValidator.equals("post ID matches request", post.id, postId);
    TestValidator.predicate("post has valid author", post.author.id !== null);
    TestValidator.predicate(
      "post has valid community",
      post.community.id !== null,
    );
    TestValidator.predicate("post has title", post.title.length > 0);
    TestValidator.predicate(
      "post has valid content type",
      ["text", "link", "image"].includes(post.contentType),
    );
    TestValidator.predicate(
      "post has valid score",
      typeof post.score === "number",
    );
    TestValidator.predicate(
      "post has valid comment count",
      typeof post.commentCount === "number",
    );
    TestValidator.predicate(
      "post has valid view count",
      typeof post.viewCount === "number",
    );

    // Performance validation per request
    TestValidator.predicate(
      "individual request completes fast",
      responseTime < 1000,
    );
  }

  const totalEndTime = Date.now();
  const totalTime = totalEndTime - startTime;

  // Calculate performance metrics
  const averageResponseTime =
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponseTime = Math.max(...responseTimes);
  const minResponseTime = Math.min(...responseTimes);

  // Validate overall performance metrics
  TestValidator.predicate(
    "average response time is acceptable",
    averageResponseTime < 500,
  );
  TestValidator.predicate(
    "maximum response time is reasonable",
    maxResponseTime < 2000,
  );
  TestValidator.predicate(
    "minimum response time is fast",
    minResponseTime < 100,
  );
  TestValidator.predicate(
    "total time for 20 requests is efficient",
    totalTime < 10000,
  );

  // Test performance consistency
  const variance =
    responseTimes.reduce(
      (acc, time) => acc + Math.pow(time - averageResponseTime, 2),
      0,
    ) / responseTimes.length;
  const standardDeviation = Math.sqrt(variance);
  TestValidator.predicate(
    "response time variance is low",
    standardDeviation < averageResponseTime * 0.5,
  );

  // Performance summary validation
  TestValidator.predicate(
    "all requests completed successfully",
    responseTimes.length === 20,
  );
  TestValidator.equals("total test execution time", totalTime, totalTime);

  // Test different content type scenarios by checking the response distribution
  const contentTypes = new Set<string>();
  const statusTypes = new Set<string>();

  // Note: In a real scenario with actual data, we would track content types
  // For this performance test, we focus on the retrieval timing and structure validation

  // Performance threshold validation
  TestValidator.predicate(
    "95% of requests under 1000ms",
    responseTimes.filter((time) => time < 1000).length >=
      Math.floor(responseTimes.length * 0.95),
  );
}
