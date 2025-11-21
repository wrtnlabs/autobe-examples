import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test comprehensive channel discovery scenarios that return no results.
 *
 * Validates that the `/shoppingMall/channels` API correctly handles search and
 * filter combinations that don't match any marketplace channels, ensuring
 * proper empty result responses with valid pagination metadata structure.
 *
 * Test scenarios include:
 *
 * 1. Empty search terms matching no channels
 * 2. Non-existent currency codes invalidating results
 * 3. Invalid language settings producing zero matches
 * 4. Combined filter criteria that collectively return nothing
 * 5. Validation that pagination metadata correctly indicates zero records
 * 6. Edge cases for search term length and filter combinations
 * 7. Boundary conditions for currency and language constraints
 *
 * This test ensures the channel discovery system gracefully handles user
 * scenarios where no marketplace channels are found, providing consistent API
 * responses that maintain proper structure while clearly communicating zero
 * results.
 */
export async function test_api_channel_empty_results_handling(
  connection: api.IConnection,
) {
  // Test 1: Empty search term with valid other filters
  // Validates search behavior when empty query matches no channels
  const emptySearchRequest = {
    page: 1,
    limit: 20,
    search: "",
    isActive: true,
  } satisfies IShoppingMallChannel.IRequest;

  const emptySearchResponse = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: emptySearchRequest,
    },
  );

  typia.assert(emptySearchResponse);
  TestValidator.equals(
    "empty search returns proper structure",
    Array.isArray(emptySearchResponse.data),
    true,
  );
  TestValidator.predicate(
    "empty search has valid pagination",
    emptySearchResponse.pagination.current >= 0,
  );

  // Test 2: Non-existent currency code filter
  // Tests filtering by imaginary currency code (ZZZ) that no channels support
  const invalidCurrencyRequest = {
    page: 1,
    limit: 20,
    currencyCode: "ZZZ" as string & tags.MaxLength<3>,
  } satisfies IShoppingMallChannel.IRequest;

  const invalidCurrencyResponse =
    await api.functional.shoppingMall.channels.index(connection, {
      body: invalidCurrencyRequest,
    });

  typia.assert(invalidCurrencyResponse);
  TestValidator.equals(
    "non-existent currency returns empty data",
    invalidCurrencyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records count zero",
    invalidCurrencyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count zero",
    invalidCurrencyResponse.pagination.pages,
    0,
  );

  // Test 3: Invalid language code
  // Tests excluding channels via invalid language specification
  const invalidLanguageRequest = {
    page: 1,
    limit: 25,
    language: "xx-XX" as string & tags.MaxLength<10>,
  } satisfies IShoppingMallChannel.IRequest;

  const invalidLanguageResponse =
    await api.functional.shoppingMall.channels.index(connection, {
      body: invalidLanguageRequest,
    });

  typia.assert(invalidLanguageResponse);
  TestValidator.equals(
    "invalid language returns empty results",
    invalidLanguageResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination limit preserved",
    invalidLanguageResponse.pagination.limit,
    25,
  );

  // Test 4: Complex filter combination with no matches
  // Tests combining multiple restrictive filters that progressively eliminate all channels
  const complexEmptyRequest = {
    page: 1,
    limit: 10,
    search: "nonexistent_channel_that_cannot_exist",
    isActive: false,
    currencyCode: "XYZ" as string & tags.MaxLength<3>,
    language: "zz-ZZ" as string & tags.MaxLength<10>,
    sortBy: "name",
    sortOrder: "asc",
  } satisfies IShoppingMallChannel.IRequest;

  const complexEmptyResponse = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: complexEmptyRequest,
    },
  );

  typia.assert(complexEmptyResponse);
  TestValidator.equals(
    "complex filters yield empty results",
    complexEmptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "complex request pagination current page",
    complexEmptyResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "complex request records validate to zero",
    complexEmptyResponse.pagination.records === 0,
  );

  // Test 5: Maximum search term length
  // Validates edge case handling of search terms at the maximum allowed length
  const maxLengthSearch = typia.random<string & tags.MaxLength<100>>();
  const maxLengthRequest = {
    page: 1,
    limit: 50,
    search: maxLengthSearch,
    sortBy: "code",
    sortOrder: "desc",
  } satisfies IShoppingMallChannel.IRequest;

  const maxLengthResponse = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: maxLengthRequest,
    },
  );

  typia.assert(maxLengthResponse);
  TestValidator.equals(
    "max length search pagination current valid",
    maxLengthResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "max length search results array type correct",
    Array.isArray(maxLengthResponse.data),
    true,
  );

  // Test 6: Currency code length constraint
  // Tests currency filtering with exactly 3 characters as per TagMaxLength<3>
  const exactCurrencySearch = {
    page: 2,
    limit: 15,
    currencyCode: "ABC" as string & tags.MaxLength<3>,
    code: "NONEXISTENT" as string & tags.MaxLength<50>,
  } satisfies IShoppingMallChannel.IRequest;

  const exactCurrencyResponse =
    await api.functional.shoppingMall.channels.index(connection, {
      body: exactCurrencySearch,
    });

  typia.assert(exactCurrencyResponse);
  TestValidator.equals(
    "exact currency page 2 validation",
    exactCurrencyResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "exact currency empty data array",
    exactCurrencyResponse.data.length,
    0,
  );

  // Test 7: Language code format validation
  // Tests language filtering staying within MaxLength<10> constraint for various formats
  const languageCodeTest = {
    page: 1,
    limit: 30,
    language: "invalid-lang-code",
    isActive: undefined,
  } satisfies IShoppingMallChannel.IRequest;

  const languageCodeResponse = await api.functional.shoppingMall.channels.index(
    connection,
    {
      body: languageCodeTest,
    },
  );

  typia.assert(languageCodeResponse);
  TestValidator.equals(
    "language code results valid",
    Array.isArray(languageCodeResponse.data),
    true,
  );
  TestValidator.equals(
    "language pagination limit matches request",
    languageCodeResponse.pagination.limit,
    30,
  );
}
