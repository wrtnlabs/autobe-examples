import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_posts_vote_scores_date_range_filtering(
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
  // Test 1: Recent posts (last hour)
  const recentStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentEnd = new Date().toISOString();
  const recentResponse =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          start_last_updated_at: recentStart,
          end_last_updated_at: recentEnd,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(recentResponse);
  // Test 2: Older posts (last day to last hour)
  const olderStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const olderEnd = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const olderResponse =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          start_last_updated_at: olderStart,
          end_last_updated_at: olderEnd,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(olderResponse);
  // Test 3: Specific date range (yesterday to today)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const today = new Date();
  const specificResponse =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          start_last_updated_at: yesterday.toISOString(),
          end_last_updated_at: today.toISOString(),
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(specificResponse);
  // Test 4: Future dates (should return empty)
  const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const futureEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const futureResponse =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          start_last_updated_at: futureStart,
          end_last_updated_at: futureEnd,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date range should return empty",
    futureResponse.data.length,
    0,
  );
  // Test 5: Only start date (all posts after start)
  const startOnlyResponse =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          start_last_updated_at: recentStart,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(startOnlyResponse);
  // Test 6: Only end date (all posts before end)
  const endOnlyResponse =
    await api.functional.communityPlatform.admin.posts.vote_scores.index(
      adminConnection,
      {
        body: {
          end_last_updated_at: recentEnd,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformPostVoteScore.IRequest,
      },
    );
  typia.assert(endOnlyResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination should have valid structure",
    recentResponse.pagination.current >= 1 &&
      recentResponse.pagination.limit >= 1 &&
      recentResponse.pagination.limit <= 100 &&
      recentResponse.pagination.records >= 0 &&
      recentResponse.pagination.pages >= 0,
  );
  // Validate vote score structure (business logic only)
  if (recentResponse.data.length > 0) {
    const voteScore = recentResponse.data[0];
    TestValidator.predicate(
      "upvote count should be non-negative",
      voteScore.upvote_count >= 0,
    );
    TestValidator.predicate(
      "downvote count should be non-negative",
      voteScore.downvote_count >= 0,
    );
    TestValidator.predicate(
      "total score should be calculated correctly",
      voteScore.total_score ===
        voteScore.upvote_count - voteScore.downvote_count,
    );
  }
}
