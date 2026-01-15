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
export async function test_api_salescurrencyrates_filter_by_currency_pair(
  connection: api.IConnection,
): Promise<void> {
  // The requested test scenario requires filtering currency rates by fromCurrency and toCurrency
  // However, the system only provides the index endpoint for reading/filtering data
  // We cannot create test data because no create endpoint is available
  // Therefore, we test the filter functionality on existing system data
  // Define the filter request exactly as specified in the scenario
  // Use the correct DTO type: ICommunityPlatformSaleCurrencyRate.IRequest
  const filterRequest: ICommunityPlatformSaleCurrencyRate.IRequest = {
    fromCurrency: "USD",
    toCurrency: "EUR",
  };
  // Call the API endpoint to filter currency rates by the specified currency pair
  const response: IPageICommunityPlatformSaleCurrencyRate =
    await api.functional.communityPlatform.salescurrencyrates.index(
      connection,
      {
        body: filterRequest,
      },
    );
  // Type safety validation - this validates the complete structure matches IPageICommunityPlatformSaleCurrencyRate
  typia.assert(response);
  // Validate the response structure matches the expected schema
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is positive",
    response.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
    true,
  );
  // Validate the data array type
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Verify that any returned records match the requested currency pair
  // If no results, this predicate will be vacuously true
  TestValidator.predicate(
    "all returned records match USD to EUR pair",
    response.data.every(
      (record) => record.fromCurrency === "USD" && record.toCurrency === "EUR",
    ),
  );
  // Validate each returned record has correct structure
  for (const record of response.data) {
    // Validate ISO 4217 code format (3 uppercase letters)
    TestValidator.predicate(
      "fromCurrency has valid ISO 4217 format",
      /^[A-Z]{3}$/.test(record.fromCurrency),
    );
    TestValidator.predicate(
      "toCurrency has valid ISO 4217 format",
      /^[A-Z]{3}$/.test(record.toCurrency),
    );
    // Validate rate is positive and has proper precision (multiple of 1e-8)
    TestValidator.predicate("rate is positive", record.rate > 0);
    TestValidator.predicate(
      "rate has proper precision (multiple of 1e-8)",
      record.rate % 1e-8 === 0,
    );
    // Validate date-time format for effectiveFrom (ISO 8601)
    TestValidator.predicate(
      "effectiveFrom is ISO 8601 date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        record.effectiveFrom,
      ),
    );
    // Validate effectiveTo if present (must be ISO 8601 or null)
    if (record.effectiveTo) {
      TestValidator.predicate(
        "effectiveTo is ISO 8601 date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          record.effectiveTo,
        ),
      );
    }
    // Validate provider and rateType are strings or undefined
    TestValidator.predicate(
      "provider is string or undefined",
      record.provider === undefined || typeof record.provider === "string",
    );
    TestValidator.predicate(
      "rateType is string or undefined",
      record.rateType === undefined || typeof record.rateType === "string",
    );
  }
}