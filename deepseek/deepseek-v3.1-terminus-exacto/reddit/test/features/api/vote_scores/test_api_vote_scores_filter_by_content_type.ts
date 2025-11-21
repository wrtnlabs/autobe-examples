import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteScore";

/**
 * Test vote scores filtering by content type (post vs comment).
 *
 * Validates that administrators can filter vote score records by content_type
 * parameter, ensuring only scores for the specified content type are returned.
 * Tests both 'post' and 'comment' filter values to verify accurate content type
 * classification.
 *
 * This test ensures the filtering mechanism correctly segregates vote scores
 * based on content type classification, which is essential for proper content
 * management and analytics in the community platform.
 */
export async function test_api_vote_scores_filter_by_content_type(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123",
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Search vote scores with content_type filter set to 'post'
  const postScores =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        content_type: "post",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(postScores);

  // Step 3: Search vote scores with content_type filter set to 'comment'
  const commentScores =
    await api.functional.communityPlatform.admin.voteScores.index(connection, {
      body: {
        content_type: "comment",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformVoteScore.IRequest,
    });
  typia.assert(commentScores);

  // Step 4: Validate pagination structure for both searches
  TestValidator.equals(
    "post scores pagination structure is correct",
    postScores.pagination,
    {
      current: 1,
      limit: 10,
      records: postScores.pagination.records,
      pages: postScores.pagination.pages,
    } satisfies IPage.IPagination,
  );

  TestValidator.equals(
    "comment scores pagination structure is correct",
    commentScores.pagination,
    {
      current: 1,
      limit: 10,
      records: commentScores.pagination.records,
      pages: commentScores.pagination.pages,
    } satisfies IPage.IPagination,
  );

  // Step 5: Validate that post scores contain only 'post' content type
  if (postScores.data.length > 0) {
    TestValidator.predicate(
      "all post scores have content_type 'post'",
      postScores.data.every((score) => score.content_type === "post"),
    );
  }

  // Step 6: Validate that comment scores contain only 'comment' content type
  if (commentScores.data.length > 0) {
    TestValidator.predicate(
      "all comment scores have content_type 'comment'",
      commentScores.data.every((score) => score.content_type === "comment"),
    );
  }

  // Step 7: Validate vote score structure for returned records
  if (postScores.data.length > 0) {
    const samplePostScore = postScores.data[0];
    typia.assert(samplePostScore);
    TestValidator.predicate(
      "post score has valid total_score",
      samplePostScore.total_score >= 0,
    );
    TestValidator.predicate(
      "post score has valid upvote_count",
      samplePostScore.upvote_count >= 0,
    );
    TestValidator.predicate(
      "post score has valid downvote_count",
      samplePostScore.downvote_count >= 0,
    );
  }

  if (commentScores.data.length > 0) {
    const sampleCommentScore = commentScores.data[0];
    typia.assert(sampleCommentScore);
    TestValidator.predicate(
      "comment score has valid total_score",
      sampleCommentScore.total_score >= 0,
    );
    TestValidator.predicate(
      "comment score has valid upvote_count",
      sampleCommentScore.upvote_count >= 0,
    );
    TestValidator.predicate(
      "comment score has valid downvote_count",
      sampleCommentScore.downvote_count >= 0,
    );
  }
}
