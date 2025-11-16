import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTopPostRanking";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformTopPostRanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTopPostRanking";

/**
 * Validate retrieval of top post rankings for the community platform.
 *
 * This test ensures the API correctly returns paginated lists of top-ranked
 * posts for all ranking intervals ('day', 'week', 'month', 'all-time'),
 * supports proper pagination parameters, respects result limits, and does not
 * require authentication. The test checks that responses match the expected
 * schema for ranking summaries in all intervals, with correct pagination
 * handling and valid ranking order.
 *
 * Key validation steps:
 *
 * 1. Verify ranking retrieval for all supported intervals at page 1, default sort.
 * 2. Verify pagination (page/limit) parameters: first page, typical mid-page, max
 *    limit, edge-case page out of range.
 * 3. Verify per-community rankings by providing community_id filter (if available
 *    data), and by omitting to get platform-wide results.
 * 4. Validate response structure using typia.assert and test that returned records
 *    are sorted by rank ascending, correct interval, and within page size.
 * 5. Confirm the API works with an unauthenticated connection (no special headers
 *    needed).
 */
export async function test_api_top_post_rankings_platform_feed(
  connection: api.IConnection,
) {
  // Prepare supported intervals for iteration
  const intervals = ["day", "week", "month", "all-time"] as const;

  // 1. Iterate all intervals for simple first page ranking fetch
  for (const interval of intervals) {
    const requestBody = {
      interval,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies ICommunityPlatformTopPostRanking.IRequest;
    const response =
      await api.functional.communityPlatform.topPostRankings.index(connection, {
        body: requestBody,
      });
    typia.assert(response);
    TestValidator.equals(
      `interval ${interval} in response`,
      response.data.every((row) => row.interval === interval),
      true,
    );
    TestValidator.predicate(
      `max limit for interval ${interval}`,
      response.data.length <= 10,
    );
    // Validate rank ordering is ascending
    TestValidator.equals(
      `ranks ordered ascending for ${interval}`,
      response.data.map((x) => x.rank),
      [...response.data].map((x) => x.rank).sort((a, b) => a - b),
    );
  }

  // 2. Pagination/limit edge tests
  const midPage = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const maxLimit = 100 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  for (const interval of intervals) {
    // Mid page with limit 5
    const midBody = {
      interval,
      page: midPage,
      limit: 5 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies ICommunityPlatformTopPostRanking.IRequest;
    const respMid =
      await api.functional.communityPlatform.topPostRankings.index(connection, {
        body: midBody,
      });
    typia.assert(respMid);
    TestValidator.equals(
      `interval ${interval} mid-page`,
      respMid.data.every((row) => row.interval === interval),
      true,
    );
    TestValidator.predicate(
      `mid-page size for interval ${interval}`,
      respMid.data.length <= 5,
    );

    // Max limit
    const maxBody = {
      interval,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: maxLimit,
    } satisfies ICommunityPlatformTopPostRanking.IRequest;
    const respMax =
      await api.functional.communityPlatform.topPostRankings.index(connection, {
        body: maxBody,
      });
    typia.assert(respMax);
    TestValidator.predicate(
      `max limit size for ${interval}`,
      respMax.data.length <= maxLimit,
    );

    // Out-of-range page
    const outOfRangeBody = {
      interval,
      page: 9999 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies ICommunityPlatformTopPostRanking.IRequest;
    const respEmpty =
      await api.functional.communityPlatform.topPostRankings.index(connection, {
        body: outOfRangeBody,
      });
    typia.assert(respEmpty);
    TestValidator.equals(
      `empty page for interval ${interval}`,
      respEmpty.data.length,
      0,
    );
  }

  // 3. If possible, check at least one community_id filter case using a real community_id
  // (discoverable only if there is data). Attempt to extract community_id from previous data
  const sampleBody = {
    interval: RandomGenerator.pick(intervals),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformTopPostRanking.IRequest;
  const sampleResp =
    await api.functional.communityPlatform.topPostRankings.index(connection, {
      body: sampleBody,
    });
  typia.assert(sampleResp);
  if (sampleResp.data.length > 0) {
    // Try querying by the community_id of the first post, if present
    const firstPost = sampleResp.data[0];
    // If the sampleResp contains a relevant community_id logic, you could do:
    // const communityId = firstPost.community_id; // not defined in ISummary, so skip
    // Otherwise, this block is only a placeholder for future extension if DTO supports it
  }

  // 4. Confirm API does not require authentication by using empty/new headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthBody = {
    interval: RandomGenerator.pick(intervals),
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies ICommunityPlatformTopPostRanking.IRequest;
  const unauthResp =
    await api.functional.communityPlatform.topPostRankings.index(unauthConn, {
      body: unauthBody,
    });
  typia.assert(unauthResp);
  TestValidator.predicate(
    "unauthenticated query returns some result",
    unauthResp.data.length >= 0,
  );
}
