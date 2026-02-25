import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_comment_vote_scores_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection using available utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: "test_moderator@example.com",
      password: "testpassword123",
      username: "testmoderator",
      display_name: "Test Moderator",
      bio: "Test moderator account for pagination testing",
      avatar_url: "https://example.com/avatar.jpg",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Test 1: Basic pagination with default parameters
  const page1 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(page1);
  // Test 2: Different page sizes
  const pageSize20 =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(pageSize20);
  // Test 3: Sorting by score descending
  const sortedByScoreDesc =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          sort_by: "score",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(sortedByScoreDesc);
  // Test 4: Sorting by upvote_count descending
  const sortedByUpvotesDesc =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          sort_by: "upvote_count",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(sortedByUpvotesDesc);
  // Test 5: Sorting by last_updated_at descending
  const sortedByRecent =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          sort_by: "last_updated_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(sortedByRecent);
  // Test 6: Filter by minimum score (using valid range)
  const highScoreComments =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          minimum_score: 10,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(highScoreComments);
  // Test 7: Filter by minimum upvotes
  const popularComments =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          minimum_upvotes: 5,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(popularComments);
  // Test 8: Filter by time range (using valid ISO string)
  const recentComments =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          updated_after: "2024-01-01T00:00:00.000Z",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(recentComments);
  // Test 9: Empty result set with extreme but valid filter
  const emptyResult =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          minimum_score: 100000,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Test 10: Boundary conditions - maximum page size
  const maxPageSize =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(maxPageSize);
  // Test 11: Boundary conditions - high page number
  const highPage =
    await api.functional.communityPlatform.moderator.comments.vote_scores.index(
      moderatorConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(highPage);
  // Validate pagination metadata consistency
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page size 20 pagination limit",
    pageSize20.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page positive",
    page1.pagination.current >= 1,
  );
  // Validate sorting behavior
  if (sortedByScoreDesc.data.length > 1) {
    TestValidator.predicate(
      "score descending order",
      sortedByScoreDesc.data[0].score >= sortedByScoreDesc.data[1].score,
    );
  }
  if (sortedByUpvotesDesc.data.length > 1) {
    TestValidator.predicate(
      "upvote_count descending order",
      sortedByUpvotesDesc.data[0].upvote_count >=
        sortedByUpvotesDesc.data[1].upvote_count,
    );
  }
  // Validate filtering behavior
  if (highScoreComments.data.length > 0) {
    TestValidator.predicate(
      "minimum score filter",
      highScoreComments.data.every((item) => item.score >= 10),
    );
  }
  if (popularComments.data.length > 0) {
    TestValidator.predicate(
      "minimum upvotes filter",
      popularComments.data.every((item) => item.upvote_count >= 5),
    );
  }
  // Validate empty result set
  TestValidator.equals(
    "extreme filter may return empty data",
    emptyResult.data.length,
    0,
  );
}
