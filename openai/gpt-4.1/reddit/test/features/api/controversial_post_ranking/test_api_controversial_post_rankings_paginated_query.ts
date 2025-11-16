import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformControversialPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformControversialPostRanking";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformControversialPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformControversialPostRanking";

/**
 * Test paginated and filtered retrieval of controversial post rankings from the
 * materialized view.
 *
 * This test verifies retrieval and pagination of controversial post rankings
 * with and without filters. It covers:
 *
 * 1. Default query (no filters/body, should apply server defaults)
 * 2. Interval filter coverage: day, week, month, all-time
 * 3. Algorithm version, rank, and controversy score filters
 * 4. Pagination logic, including edge cases (beyond max pages)
 * 5. Response structure/type correctness for all relevant fields
 * 6. Anonymous (unauthenticated) access to the endpoint
 *
 * Steps:
 *
 * 1. Call the rankings endpoint with an empty body (default behavior)
 * 2. Call filtered queries for each interval value (if any posts returned)
 * 3. Use values (algorithmVersion, rank, controversyScore) found in page data for
 *    precise filter queries
 * 4. Iterate pagination up to beyond last page (pages = Math.ceil(records /
 *    limit)), checking returned data and correct page meta
 * 5. For every response, validate structure and all expected fields of
 *    ICommunityPlatformControversialPostRanking for every data row (id, post,
 *    post_id, rank, controversy_score, interval, algorithm_version,
 *    computed_at), using typia.assert for strict typing
 * 6. Validate response for unauthenticated connection (headers: {})
 *
 * Notes:
 *
 * - The view is read-only; no data creation or user authentication required
 * - Filter values may be null/undefined/not present depending on test data in the
 *   materialized view
 * - All validation is structure/type/business logic (not data changes)
 */
export async function test_api_controversial_post_rankings_paginated_query(
  connection: api.IConnection,
) {
  // 1. Default query: call endpoint with no body (should apply server defaults)
  const defaultRes: IPageICommunityPlatformControversialPostRanking =
    await api.functional.communityPlatform.controversialPostRankings.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformControversialPostRanking.IRequest,
      },
    );
  typia.assert(defaultRes);
  TestValidator.predicate(
    "default paging returns pagination object",
    typeof defaultRes.pagination === "object",
  );
  TestValidator.predicate(
    "default paging returns data array",
    Array.isArray(defaultRes.data),
  );
  // For each item in data, validate typia.assert, and all required properties
  ArrayUtil.repeat(defaultRes.data.length, (i) => {
    typia.assert(defaultRes.data[i]);
    TestValidator.predicate(
      `row ${i} has id`,
      typeof defaultRes.data[i].id === "string" && !!defaultRes.data[i].id,
    );
    TestValidator.predicate(
      `row ${i} has post`,
      typeof defaultRes.data[i].post === "object",
    );
    TestValidator.predicate(
      `row ${i} has post_id`,
      typeof defaultRes.data[i].post_id === "string",
    );
    TestValidator.predicate(
      `row ${i} has rank`,
      typeof defaultRes.data[i].rank === "number",
    );
    TestValidator.predicate(
      `row ${i} has controversy_score`,
      typeof defaultRes.data[i].controversy_score === "number",
    );
    TestValidator.predicate(
      `row ${i} has interval`,
      typeof defaultRes.data[i].interval === "string",
    );
    TestValidator.predicate(
      `row ${i} has algorithm_version`,
      typeof defaultRes.data[i].algorithm_version === "string",
    );
    TestValidator.predicate(
      `row ${i} has computed_at`,
      typeof defaultRes.data[i].computed_at === "string" &&
        !!defaultRes.data[i].computed_at,
    );
  });

  // 2. Filter test: Try all supported interval filters if at least one record returned
  const intervals = ["day", "week", "month", "all-time"] as const;
  for (const interval of intervals) {
    const res =
      await api.functional.communityPlatform.controversialPostRankings.index(
        connection,
        {
          body: {
            interval,
          } satisfies ICommunityPlatformControversialPostRanking.IRequest,
        },
      );
    typia.assert(res);
    TestValidator.equals(
      `filtered by interval ${interval} pagination object`,
      res.pagination.current,
      0,
    );
    // Could be empty, but should always return correct structure
    TestValidator.predicate(
      `filtered by interval ${interval} returns data array`,
      Array.isArray(res.data),
    );
    for (let i = 0; i < res.data.length; ++i) {
      typia.assert(res.data[i]);
    }
  }

  // 3. Try queries filtered by available values from first data page, if any
  if (defaultRes.data.length > 0) {
    const sample = defaultRes.data[0];
    // AlgorithmVersion filter
    const byAlgorithm =
      await api.functional.communityPlatform.controversialPostRankings.index(
        connection,
        {
          body: {
            algorithmVersion: sample.algorithm_version,
          } satisfies ICommunityPlatformControversialPostRanking.IRequest,
        },
      );
    typia.assert(byAlgorithm);
    TestValidator.predicate(
      "filtered by algorithmVersion returns correct data array",
      Array.isArray(byAlgorithm.data),
    );
    for (let i = 0; i < byAlgorithm.data.length; ++i) {
      typia.assert(byAlgorithm.data[i]);
      TestValidator.equals(
        "filtered data row matches algorithmVersion",
        byAlgorithm.data[i].algorithm_version,
        sample.algorithm_version,
      );
    }
    // Rank and controversyScore filters
    const byRank =
      await api.functional.communityPlatform.controversialPostRankings.index(
        connection,
        {
          body: {
            rankMin: sample.rank,
            rankMax: sample.rank,
          } satisfies ICommunityPlatformControversialPostRanking.IRequest,
        },
      );
    typia.assert(byRank);
    for (let i = 0; i < byRank.data.length; ++i) {
      typia.assert(byRank.data[i]);
      TestValidator.equals(
        "filtered data row matches rank",
        byRank.data[i].rank,
        sample.rank,
      );
    }
    const byScore =
      await api.functional.communityPlatform.controversialPostRankings.index(
        connection,
        {
          body: {
            controversyScoreMin: sample.controversy_score,
            controversyScoreMax: sample.controversy_score,
          } satisfies ICommunityPlatformControversialPostRanking.IRequest,
        },
      );
    typia.assert(byScore);
    for (let i = 0; i < byScore.data.length; ++i) {
      typia.assert(byScore.data[i]);
      TestValidator.equals(
        "filtered data row matches controversy_score",
        byScore.data[i].controversy_score,
        sample.controversy_score,
      );
    }
  }

  // 4. Pagination: Try to get a page beyond the total pages
  const limit = 5;
  const totalPages = defaultRes.pagination.pages;
  const beyondPageRes =
    await api.functional.communityPlatform.controversialPostRankings.index(
      connection,
      {
        body: {
          page: (totalPages + 1) satisfies number as number,
          limit,
        } satisfies ICommunityPlatformControversialPostRanking.IRequest,
      },
    );
  typia.assert(beyondPageRes);
  TestValidator.equals(
    "beyond last page returns empty data",
    beyondPageRes.data.length,
    0,
  );

  // 5. Unauthenticated access: should also receive data
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const anonymousRes =
    await api.functional.communityPlatform.controversialPostRankings.index(
      unauthConn,
      {
        body: {} satisfies ICommunityPlatformControversialPostRanking.IRequest,
      },
    );
  typia.assert(anonymousRes);
  TestValidator.predicate(
    "anonymous access returns data array",
    Array.isArray(anonymousRes.data),
  );
}
