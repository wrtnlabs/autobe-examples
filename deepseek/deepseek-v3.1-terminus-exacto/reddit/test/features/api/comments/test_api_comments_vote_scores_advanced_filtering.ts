import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test advanced filtering capabilities for comment vote score analytics.
 * Create complex scenarios with comments having specific vote patterns,
 * then apply multiple filters simultaneously.
 */
export async function test_api_comments_vote_scores_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Note: Since we cannot create actual comment vote score records through available APIs,
  // we test the filtering functionality against whatever data exists in the system.
  // The test validates that filters work correctly when applied to existing data.
  // Test 1: Filter by positive scores only
  const positiveScoresResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          minimum_score: 1,
          limit: 10,
          page: 1,
          sort_by: "score",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(positiveScoresResponse);
  // Validate all returned scores are positive (if any exist)
  for (const score of positiveScoresResponse.data) {
    TestValidator.predicate("positive score filter", score.score > 0);
  }
  // Test 2: Filter by controversial scores (near zero)
  const controversialResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          minimum_score: -10,
          maximum_score: 10,
          minimum_upvotes: 1,
          minimum_downvotes: 1,
          limit: 10,
          page: 1,
          sort_by: "score",
          sort_order: "asc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // Validate controversial scores are within range (if any exist)
  for (const score of controversialResponse.data) {
    TestValidator.predicate(
      "controversial score range",
      score.score >= -10 && score.score <= 10,
    );
    TestValidator.predicate("minimum upvotes", score.upvote_count >= 1);
    TestValidator.predicate("minimum downvotes", score.downvote_count >= 1);
  }
  // Test 3: Time-based filtering
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const timeFilterResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          updated_after: oneDayAgo,
          limit: 5,
          page: 1,
          sort_by: "last_updated_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(timeFilterResponse);
  // Test 4: Combined filters - negative scores with minimum engagement
  const combinedFilterResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          maximum_score: -1,
          minimum_upvotes: 1,
          updated_after: oneDayAgo,
          limit: 5,
          page: 1,
          sort_by: "upvote_count",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined filter results (if any exist)
  for (const score of combinedFilterResponse.data) {
    TestValidator.predicate("negative score", score.score <= -1);
    TestValidator.predicate("minimum upvotes", score.upvote_count >= 1);
  }
  // Test 5: Pagination validation
  const paginationResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          limit: 3,
          page: 1,
          sort_by: "score",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination limit",
    paginationResponse.data.length <= 3,
  );
  TestValidator.equals("page number", paginationResponse.pagination.current, 1);
  TestValidator.equals("page limit", paginationResponse.pagination.limit, 3);
  // Test 6: Content filtering (if supported by the system)
  const contentFilterResponse =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {
          comment_content: "test",
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(contentFilterResponse);
}
