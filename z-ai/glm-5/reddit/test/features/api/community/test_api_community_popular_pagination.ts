import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test pagination functionality for popular communities endpoint.
 *
 * Validates:
 * - Response structure contains pagination metadata and data array
 * - Pagination fields (current, limit, records, pages) are valid
 * - Communities are sorted by subscriber_count descending
 * - Each community has required fields with correct types
 * - No authentication required (public endpoint)
 */
export async function test_api_community_popular_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Call the popular communities endpoint (public endpoint, no auth required)
  const result = await api.functional.community.communities.popular(connection);
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate(
    "pagination.current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // Validate each community in data array and verify sorting
  if (result.data.length > 0) {
    // Verify all communities have required fields
    for (const community of result.data) {
      typia.assert(community);
    }
    // Verify communities are sorted by subscriber_count descending
    const subscriberCounts = result.data.map((c) => c.subscriber_count);
    for (let i = 0; i < subscriberCounts.length - 1; i++) {
      TestValidator.predicate(
        `communities sorted by subscriber_count descending at index ${i}`,
        subscriberCounts[i] >= subscriberCounts[i + 1],
      );
    }
    // Verify pagination consistency
    TestValidator.predicate(
      "data length does not exceed limit",
      result.data.length <= result.pagination.limit,
    );
    TestValidator.predicate(
      "records count is at least data length",
      result.pagination.records >= result.data.length,
    );
    // Verify pages calculation
    const expectedPages =
      result.pagination.limit > 0
        ? Math.ceil(result.pagination.records / result.pagination.limit)
        : 0;
    TestValidator.equals(
      "pages calculation is correct",
      result.pagination.pages,
      expectedPages,
    );
  } else {
    // Empty data case - records should be 0
    TestValidator.equals(
      "empty data means zero records",
      result.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty data means zero pages",
      result.pagination.pages,
      0,
    );
  }
}
