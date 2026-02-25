import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comments_vote_scores_filter_score_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test filtering by minimum score (positive scores only)
  const positiveScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_score: 1,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(positiveScores);
  // Validate all scores meet minimum threshold
  for (const score of positiveScores.data) {
    TestValidator.predicate("score meets minimum threshold", score.score >= 1);
  }
  // Test filtering by maximum score (negative scores only)
  const negativeScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          maximum_score: -1,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(negativeScores);
  // Validate all scores meet maximum threshold
  for (const score of negativeScores.data) {
    TestValidator.predicate("score meets maximum threshold", score.score <= -1);
  }
  // Test filtering by score range
  const rangeScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_score: -5,
          maximum_score: 5,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(rangeScores);
  // Validate all scores are within range
  for (const score of rangeScores.data) {
    TestValidator.predicate(
      "score within range",
      score.score >= -5 && score.score <= 5,
    );
  }
  // Test filtering for zero scores
  const zeroScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_score: 0,
          maximum_score: 0,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(zeroScores);
  // Validate all scores are exactly zero
  for (const score of zeroScores.data) {
    TestValidator.equals("score is zero", score.score, 0);
  }
  // Test pagination functionality
  const paginatedScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_score: -10,
          maximum_score: 10,
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(paginatedScores);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination limit valid",
    paginatedScores.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "pagination current page valid",
    paginatedScores.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count valid",
    paginatedScores.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count valid",
    paginatedScores.pagination.pages >= 0,
  );
  // Test sorting by score
  const sortedScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_score: -10,
          maximum_score: 10,
          sort_by: "score",
          sort_order: "desc",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(sortedScores);
  // Validate scores are sorted in descending order
  if (sortedScores.data.length > 1) {
    for (let i = 0; i < sortedScores.data.length - 1; i++) {
      TestValidator.predicate(
        "scores sorted descending",
        sortedScores.data[i].score >= sortedScores.data[i + 1].score,
      );
    }
  }
  // Test vote count filtering
  const highUpvoteScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_upvotes: 5,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(highUpvoteScores);
  // Validate upvote counts meet threshold
  for (const score of highUpvoteScores.data) {
    TestValidator.predicate(
      "upvote count meets minimum",
      score.upvote_count >= 5,
    );
  }
  // Test downvote count filtering
  const highDownvoteScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_downvotes: 3,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(highDownvoteScores);
  // Validate downvote counts meet threshold
  for (const score of highDownvoteScores.data) {
    TestValidator.predicate(
      "downvote count meets minimum",
      score.downvote_count >= 3,
    );
  }
  // Test combined vote count filtering
  const combinedFilterScores =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_upvotes: 2,
          minimum_downvotes: 1,
          minimum_score: -5,
          maximum_score: 10,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(combinedFilterScores);
  // Validate combined filtering criteria
  for (const score of combinedFilterScores.data) {
    TestValidator.predicate("meets upvote threshold", score.upvote_count >= 2);
    TestValidator.predicate(
      "meets downvote threshold",
      score.downvote_count >= 1,
    );
    TestValidator.predicate(
      "score within range",
      score.score >= -5 && score.score <= 10,
    );
  }
}
