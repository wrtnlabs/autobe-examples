import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleCurrencyRate";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleCurrencyRate";
export async function test_api_salescurrencyrates_filter_by_provider_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for the test
  const testConnection: api.IConnection = { host: connection.host };
  // Step 2: Test querying with no filters
  const resultWithNoFilters =
    await api.functional.communityPlatform.salescurrencyrates.index(
      testConnection,
      {
        body: {} satisfies ICommunityPlatformSaleCurrencyRate.IRequest,
      },
    );
  typia.assert(resultWithNoFilters);
  TestValidator.equals(
    "No filters returns valid page structure",
    resultWithNoFilters.pagination.current,
    0,
  );
  TestValidator.equals(
    "No filters returns valid page structure",
    resultWithNoFilters.pagination.limit,
    0,
  );
  TestValidator.equals(
    "No filters returns valid page structure",
    resultWithNoFilters.pagination.records,
    0,
  );
  TestValidator.equals(
    "No filters returns valid page structure",
    resultWithNoFilters.pagination.pages,
    0,
  );
  TestValidator.equals(
    "No filters returns empty array",
    resultWithNoFilters.data.length,
    0,
  );
  // Step 3: Test filtering by a nonexistent provider
  const resultWithNonExistentProvider =
    await api.functional.communityPlatform.salescurrencyrates.index(
      testConnection,
      {
        body: {
          provider: "NonExistentProvider",
        } satisfies ICommunityPlatformSaleCurrencyRate.IRequest,
      },
    );
  typia.assert(resultWithNonExistentProvider);
  TestValidator.equals(
    "Non-existent provider returns empty array",
    resultWithNonExistentProvider.data.length,
    0,
  );
  // Step 4: Test filtering by a nonexistent rateType
  const resultWithNonExistentRateType =
    await api.functional.communityPlatform.salescurrencyrates.index(
      testConnection,
      {
        body: {
          rateType: "nonexistent",
        } satisfies ICommunityPlatformSaleCurrencyRate.IRequest,
      },
    );
  typia.assert(resultWithNonExistentRateType);
  TestValidator.equals(
    "Non-existent rateType returns empty array",
    resultWithNonExistentRateType.data.length,
    0,
  );
  // Step 5: Test filtering by both nonexistent provider and rateType
  const resultWithBothNonExistent =
    await api.functional.communityPlatform.salescurrencyrates.index(
      testConnection,
      {
        body: {
          provider: "NonExistentProvider",
          rateType: "nonexistent",
        } satisfies ICommunityPlatformSaleCurrencyRate.IRequest,
      },
    );
  typia.assert(resultWithBothNonExistent);
  TestValidator.equals(
    "Both non-existent filters return empty array",
    resultWithBothNonExistent.data.length,
    0,
  );
  // Step 6: Test filtering by a combination of provider and rateType that might exist in the system
  // Since we cannot create records and the system state is unknown, we cannot assert any specific data
  // Only verify that the filtering works without errors and returns structured data
  // Even if no records exist, this meta-test verifies the endpoint accepts filters.
  const resultWithMixedFilters =
    await api.functional.communityPlatform.salescurrencyrates.index(
      testConnection,
      {
        body: {
          provider: "CentralBank",
          rateType: "official",
        } satisfies ICommunityPlatformSaleCurrencyRate.IRequest,
      },
    );
  typia.assert(resultWithMixedFilters);
  // We cannot assert the count because we don't know if there are records
  // Only check that the structure is valid and it doesn't error
  TestValidator.predicate(
    "Mixed filters returns valid response",
    resultWithMixedFilters.data !== null &&
      Array.isArray(resultWithMixedFilters.data),
  );
}
