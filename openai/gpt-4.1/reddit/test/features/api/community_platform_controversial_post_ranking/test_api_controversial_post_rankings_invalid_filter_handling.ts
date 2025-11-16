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
 * Test public endpoint's handling of invalid filter and pagination input in
 * ICommunityPlatformControversialPostRanking.IRequest.
 *
 * This test iterates multiple cases of malformed and logically invalid inputs,
 * such as nonsense intervals, negative and zero page/limit, out-of-range or
 * inverted controversyScore and rank filters. For each case, the endpoint
 * should not crash and should instead return either a business error response
 * or a well-formed page object with data.length === 0, according to public API
 * policy (never leak backend or stack trace info). Authentication is not
 * required. No test uses type-incorrect property values—all values are valid
 * types for DTO—but are invalid or unreasonable logically or by business
 * rules.
 */
export async function test_api_controversial_post_rankings_invalid_filter_handling(
  connection: api.IConnection,
) {
  // Logical edge cases preparations
  const invalidCases: ICommunityPlatformControversialPostRanking.IRequest[] = [
    // nonsense interval
    { interval: "nonsense-value-for-interval" },
    // negative and zero page and limit
    { page: -1, limit: -20 },
    { page: 0, limit: 0 },
    // extreme controversy score/rank
    { controversyScoreMin: 99999999, controversyScoreMax: 1000000000 },
    { rankMin: 5000000, rankMax: 1000000 }, // min greater than max
    { rankMin: -10, rankMax: -5 }, // negative ranks
    { rankMin: 100, rankMax: 10 }, // min > max
    { controversyScoreMin: 100, controversyScoreMax: 10 }, // min > max
    // invalid algorithmVersion
    { algorithmVersion: "invalid-version-id" },
  ];

  for (const [i, invalidBody] of invalidCases.entries()) {
    const response =
      await api.functional.communityPlatform.controversialPostRankings.index(
        connection,
        {
          body: invalidBody,
        },
      );
    typia.assert<IPageICommunityPlatformControversialPostRanking>(response);
    // Should *never* return any data for invalid queries
    TestValidator.equals(
      `invalid case #${i + 1}: data length is zero`,
      response.data.length,
      0,
    );
    // Should not leak implementation details
    // (Nothing to test for stack trace directly, but by contract, page/data/empty data is OK)
  }
}
