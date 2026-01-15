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
export async function test_api_salescurrencyrates_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Since no utility functions are available, we need to use direct API calls for auth
  // But we need credentials. We'll use environmental variables or default, but they're not provided
  // So we'll need to rely on existing auth token or use a sample
  // Since we cannot authenticate without credentials, and no utility functions are provided,
  // we'll use the connection as-is, assuming there's a default auth token
  // This is suboptimal but follows the constraint of no utility functions and no provided credentials
  // Step 2: Fetch all currency rates without filters
  const allRatesResponse: IPageICommunityPlatformSaleCurrencyRate =
    await api.functional.communityPlatform.salescurrencyrates.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(allRatesResponse);
  TestValidator.equals(
    "pagination has records",
    allRatesResponse.pagination.records > 0,
    true,
  );
  // Step 3: Define our filter criteria
  // Generate random dates within reasonable range
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 10); // 10 days ago
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 10); // 10 days from now
  // Create the filter with startDate and endDate
  const filter: ICommunityPlatformSaleCurrencyRate.IRequest = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
  // Step 4: Call the API with our filter
  const apiResponse: IPageICommunityPlatformSaleCurrencyRate =
    await api.functional.communityPlatform.salescurrencyrates.index(
      adminConnection,
      { body: filter },
    );
  typia.assert(apiResponse);
  // Step 5: Validate API response has results
  TestValidator.predicate(
    "API returned at least one result",
    apiResponse.data.length > 0,
  );
  // Step 6: Filter the allRates manually to get expected results
  // Convert dates to milliseconds for comparison
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();
  // Manual filter to match API behavior
  const expectedRates = allRatesResponse.data.filter((rate) => {
    const effectiveFromMs = new Date(rate.effectiveFrom).getTime();
    const effectiveToMs = rate.effectiveTo
      ? new Date(rate.effectiveTo).getTime()
      : Infinity;
    // Rate is included if it overlaps with the date range
    // Rate is effective during [effectiveFrom, effectiveTo]
    // We have overlap if: effectiveFrom <= endDate AND effectiveTo >= startDate
    return effectiveFromMs <= endMs && effectiveToMs >= startMs;
  });
  // Step 7: Validate that our manual filter matches API results
  TestValidator.equals(
    "API results match expected filtered data",
    apiResponse.data.length,
    expectedRates.length,
  );
  // Step 8: Validate that each rate in API result is correctly included
  for (const apiRate of apiResponse.data) {
    const effectiveFromMs = new Date(apiRate.effectiveFrom).getTime();
    const effectiveToMs = apiRate.effectiveTo
      ? new Date(apiRate.effectiveTo).getTime()
      : Infinity;
    TestValidator.predicate(
      "rate should be included by our manual filter logic",
      effectiveFromMs <= endMs && effectiveToMs >= startMs,
    );
  }
  // Step 9: Validate that no rate outside range is included
  // We'll ensure no rate that should be excluded is included
  const excludedRates = allRatesResponse.data.filter((rate) => {
    const effectiveFromMs = new Date(rate.effectiveFrom).getTime();
    const effectiveToMs = rate.effectiveTo
      ? new Date(rate.effectiveTo).getTime()
      : Infinity;
    return effectiveFromMs > endMs || effectiveToMs < startMs;
  });
  for (const excludedRate of excludedRates) {
    const isPresent = apiResponse.data.some(
      (apiRate) => apiRate.effectiveFrom === excludedRate.effectiveFrom && apiRate.effectiveTo === excludedRate.effectiveTo,
    );
    TestValidator.predicate(
      "excluded rate should not be in API results",
      !isPresent,
    );
  }
  // Step 10: Validate chronological ordering by effectiveDate (descending)
  // Check ordering based on effectiveFrom (most recent first)
  // If effectiveFrom is equal, we compare by effectiveTo
  for (let i = 0; i < apiResponse.data.length - 1; i++) {
    const currentRate = apiResponse.data[i];
    const nextRate = apiResponse.data[i + 1];
    const currentEffectiveFrom = new Date(currentRate.effectiveFrom);
    const nextEffectiveFrom = new Date(nextRate.effectiveFrom);
    // If effectiveFrom times are different, higher (more recent) should come first
    if (currentEffectiveFrom.getTime() !== nextEffectiveFrom.getTime()) {
      TestValidator.predicate(
        "rates ordered by effectiveDate descending (effectiveFrom)",
        currentEffectiveFrom.getTime() >= nextEffectiveFrom.getTime(),
      );
    } else {
      // If effectiveFrom is same, check effectiveTo (if exists)
      const currentEffectiveTo = currentRate.effectiveTo
        ? new Date(currentRate.effectiveTo)
        : new Date(Infinity);
      const nextEffectiveTo = nextRate.effectiveTo
        ? new Date(nextRate.effectiveTo)
        : new Date(Infinity);
      TestValidator.predicate(
        "rates ordered by effectiveDate descending (effectiveTo fallback)",
        currentEffectiveTo.getTime() >= nextEffectiveTo.getTime(),
      );
    }
  }
  // Step 11: Validate pagination metadata
  TestValidator.equals(
    "pagination.current is valid",
    apiResponse.pagination.current > 0,
    true,
  );
  TestValidator.equals(
    "pagination.limit is valid",
    apiResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination.records is valid",
    apiResponse.pagination.records >= apiResponse.data.length,
    true,
  );
  TestValidator.equals(
    "pagination.pages is valid",
    apiResponse.pagination.pages > 0,
    true,
  );
}