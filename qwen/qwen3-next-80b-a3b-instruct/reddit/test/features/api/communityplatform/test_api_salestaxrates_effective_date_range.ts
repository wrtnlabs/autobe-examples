import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleTaxRate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleTaxRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleTaxRate";
export async function test_api_salestaxrates_effective_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Query tax rates with a broad date range to establish baseline
  const broadRangeResponse =
    await api.functional.communityPlatform.salestaxrates.index(connection, {
      body: {
        page: 1,
        limit: 100,
        effectiveDateStart: "2020-01-01",
        effectiveDateEnd: "2030-12-31",
      } satisfies ICommunityPlatformSaleTaxRate.IRequest,
    });
  typia.assert(broadRangeResponse);
  // Validate we have at least one tax rate in the system
  TestValidator.predicate(
    "System has at least one tax rate",
    broadRangeResponse.data.length > 0,
  );
  // Step 2: Query for tax rates within a narrowed date range
  // Use a date range that should return fewer results than the broad range
  // We cannot assume the exact dates in the system, so use a reasonable subset
  const startDate = "2022-01-01";
  const endDate = "2024-12-31";
  const narrowedRangeResponse =
    await api.functional.communityPlatform.salestaxrates.index(connection, {
      body: {
        page: 1,
        limit: 100,
        effectiveDateStart: startDate,
        effectiveDateEnd: endDate,
      } satisfies ICommunityPlatformSaleTaxRate.IRequest,
    });
  typia.assert(narrowedRangeResponse);
  // Step 3: Validate filtering logic without accessing non-existent properties
  // The schema does not define effectiveDate in the response data, so we cannot inspect it
  // We validate the filtering capability by comparing counts
  // Verify that narrowed range returns a subset of broad range (count should be less than or equal)
  // This validates that the filtering works without assuming the structure of the data
  TestValidator.predicate(
    "Narrowed range has fewer or equal records than broad range",
    narrowedRangeResponse.data.length <= broadRangeResponse.data.length,
  );
  // Verify narrowed range returns at least one record when broad range returns multiple
  if (broadRangeResponse.data.length > 1) {
    TestValidator.predicate(
      "Narrowed range returns at least one record when broad range has multiple",
      narrowedRangeResponse.data.length > 0,
    );
  }
  // Step 4: Test boundary conditions - use date range that should match a single record
  if (broadRangeResponse.data.length > 2) {
    // Use a very narrow range around the second most recent date
    // We cannot use effectiveDate from response since it's not defined in schema
    // Instead, use a conservative range around a known date boundary
    // This is a conservative approach: use dates that are likely to match at least one record
    // based on common business patterns
    const singleRecordRange = "2023-01-01";
    const singleRecordEnd = "2023-12-31";
    const singleRangeResponse =
      await api.functional.communityPlatform.salestaxrates.index(connection, {
        body: {
          page: 1,
          limit: 100,
          effectiveDateStart: singleRecordRange,
          effectiveDateEnd: singleRecordEnd,
        } satisfies ICommunityPlatformSaleTaxRate.IRequest,
      });
    typia.assert(singleRangeResponse);
    // Verify we get at least one record when using a reasonable single year range
    TestValidator.predicate(
      "Single year range returns at least one record",
      singleRangeResponse.data.length > 0,
    );
    // Verify this single year range is contained within the broader range
    TestValidator.predicate(
      "Single year range has fewer or equal records than broad range",
      singleRangeResponse.data.length <= broadRangeResponse.data.length,
    );
  }
}
