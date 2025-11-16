import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformHotPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformHotPostRanking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformHotPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformHotPostRanking";

/**
 * Validate public retrieval of hot (trending) post rankings with various
 * filters and pagination.
 *
 * This test checks that unauthenticated access to
 * /communityPlatform/hotPostRankings returns correctly paginated trending post
 * data, with all required fields present and formatted, and that query
 * parameters such as min_rank, min_score, computed_since, page, limit, sort_by,
 * and sort_order are handled and reflected in the response. The test covers
 * scenarios of normal, filtered, sorted retrieval as well as the edge case of
 * empty results.
 */
export async function test_api_hot_post_rankings_public_retrieval(
  connection: api.IConnection,
) {
  // 1. Basic retrieval (default params—should retrieve at least some records if the dataset is not empty)
  const basicResp =
    await api.functional.communityPlatform.hotPostRankings.index(connection, {
      body: {} satisfies ICommunityPlatformHotPostRanking.IRequest,
    });
  typia.assert(basicResp);
  TestValidator.predicate(
    "should return array of rankings",
    Array.isArray(basicResp.data),
  );
  TestValidator.equals(
    "pagination.current defaults to 1 or 0",
    basicResp.pagination.current === 1 || basicResp.pagination.current === 0,
    true,
  );
  if (basicResp.data.length > 0) {
    for (const entry of basicResp.data) {
      typia.assert(entry);
      TestValidator.predicate(
        "post_id is uuid",
        typeof entry.post_id === "string" && entry.post_id.length > 0,
      );
      TestValidator.predicate(
        "rank is int32 >= 1",
        typeof entry.rank === "number" && entry.rank >= 1,
      );
      TestValidator.predicate(
        "score is int32",
        typeof entry.score === "number",
      );
      TestValidator.predicate(
        "algorithm_version string",
        typeof entry.algorithm_version === "string",
      );
      TestValidator.predicate(
        "computed_at ISO 8601 date-time",
        typeof entry.computed_at === "string" && entry.computed_at.length > 0,
      );
    }
  }

  // 2. Filtering: min_rank and min_score
  const filteredResp =
    await api.functional.communityPlatform.hotPostRankings.index(connection, {
      body: {
        min_rank: 5,
        min_score: 100,
      } satisfies ICommunityPlatformHotPostRanking.IRequest,
    });
  typia.assert(filteredResp);
  for (const entry of filteredResp.data) {
    TestValidator.predicate("rank >= min_rank", entry.rank >= 5);
    TestValidator.predicate("score >= min_score", entry.score >= 100);
  }

  // 3. Filtering: computed_since in the far future (should be empty)
  const futureDate = new Date(
    Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptyResp =
    await api.functional.communityPlatform.hotPostRankings.index(connection, {
      body: {
        computed_since: futureDate,
      } satisfies ICommunityPlatformHotPostRanking.IRequest,
    });
  typia.assert(emptyResp);
  TestValidator.equals(
    "should be empty if computed_since is in far future",
    emptyResp.data.length,
    0,
  );

  // 4. Pagination and limit controls
  const pagedResp =
    await api.functional.communityPlatform.hotPostRankings.index(connection, {
      body: {
        page: 2,
        limit: 3,
      } satisfies ICommunityPlatformHotPostRanking.IRequest,
    });
  typia.assert(pagedResp);
  TestValidator.equals("pagination.limit", pagedResp.pagination.limit, 3);
  TestValidator.equals("pagination.current", pagedResp.pagination.current, 2);
  TestValidator.equals(
    "pagedResp.data.length <= limit",
    pagedResp.data.length <= 3,
    true,
  );

  // 5. Sorting by score ascending
  const sortedResp =
    await api.functional.communityPlatform.hotPostRankings.index(connection, {
      body: {
        sort_by: "score",
        sort_order: "asc",
        limit: 5,
      } satisfies ICommunityPlatformHotPostRanking.IRequest,
    });
  typia.assert(sortedResp);
  for (let i = 1; i < sortedResp.data.length; ++i) {
    TestValidator.predicate(
      `score ascending: [${i - 1}] <= [${i}]`,
      sortedResp.data[i - 1].score <= sortedResp.data[i].score,
    );
  }
}
