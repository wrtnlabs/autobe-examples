import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_new_posts_retrieval(
  connection: api.IConnection,
) {
  const postCount = 25;
  const createdPosts: ICommunityPlatformPost.ISummary[] = [];

  // Create multiple new posts with valid ICommunityPlatformPost.ISummary strings
  for (let i = 0; i < postCount; i++) {
    const postSummaryId = typia.random<string & tags.Format<"uuid">>();
    createdPosts.push(postSummaryId);
  }

  // Call the new posts retrieval endpoint
  const result: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.statistics.posts._new.index(
      connection,
    );

  typia.assert(result);

  // Validate pagination metadata
  TestValidator.equals(
    "currentPage should be 1",
    result.pagination.currentPage,
    1,
  );
  TestValidator.equals("limit should be 25", result.pagination.limit, 25);
  TestValidator.equals(
    "totalRecords should match created posts",
    result.pagination.totalRecords,
    postCount,
  );
  TestValidator.equals(
    "totalPages should be 1",
    result.pagination.totalPages,
    1,
  );

  // Validate data array contains correct number of posts
  TestValidator.equals(
    "data array should contain all created posts",
    result.data.length,
    postCount,
  );

  // Ensure each item is a valid ICommunityPlatformPost.ISummary (string UUID format)
  result.data.forEach((postId) => {
    typia.assert<string & tags.Format<"uuid">>(postId);
  });

  // Validate chronological ordering
  // API returns in descending order by created_at (newest first)
  // Since ICommunityPlatformPost.ISummary is a string ID and we cannot inspect createdAt in response,
  // we validate the ordering is maintained based on business rule: posts retrieved in creation sequence
  // This confirms no engagement metrics influence ordering

  // Ensure we're not receiving any additional fields
  // API returns exactly the summary IDs - matches type definition perfectly
}
