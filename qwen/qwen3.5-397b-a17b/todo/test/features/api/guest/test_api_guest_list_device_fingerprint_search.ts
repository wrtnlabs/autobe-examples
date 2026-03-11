import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest listing with device fingerprint search filtering.
 *
 * This test validates the search functionality on the device_fingerprint field:
 * 1. Query all guests without search filter to establish baseline
 * 2. Query with a search parameter to verify API accepts and processes the filter
 * 3. Validate response structure and pagination metadata accuracy
 *
 * Note: Since there's no guest creation endpoint, this test verifies the search
 * mechanism works correctly. Empty results are valid when no fingerprints match.
 */
export async function test_api_guest_list_device_fingerprint_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Query all guests without search filter (baseline)
  const allGuests = await api.functional.todoApp.guests.index(connection, {
    body: {
      page: 1,
      limit: 20,
    } satisfies ITodoAppGuest.IRequest,
  });
  typia.assert(allGuests);
  // 2. Query with search parameter (partial match on device_fingerprint)
  // Generate a unique search string for testing
  const searchFingerprint = `test_search_${RandomGenerator.alphabets(8)}`;
  const searchResults = await api.functional.todoApp.guests.index(connection, {
    body: {
      search: searchFingerprint,
      page: 1,
      limit: 20,
    } satisfies ITodoAppGuest.IRequest,
  });
  typia.assert(searchResults);
  // 3. Validate search results structure and pagination
  TestValidator.equals(
    "search pagination current",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search results is array",
    Array.isArray(searchResults.data),
  );
  // 4. If search returned results, validate each contains the search string
  if (searchResults.data.length > 0) {
    for (const guest of searchResults.data) {
      TestValidator.predicate(
        "guest fingerprint contains search string",
        guest.device_fingerprint.includes(searchFingerprint),
      );
    }
  }
  // 5. Test with different page sizes
  const smallPageResults = await api.functional.todoApp.guests.index(
    connection,
    {
      body: {
        search: searchFingerprint,
        page: 1,
        limit: 5,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(smallPageResults);
  TestValidator.equals(
    "small page limit",
    smallPageResults.pagination.limit,
    5,
  );
  // 6. Test with date range filters combined with search
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateFilteredResults = await api.functional.todoApp.guests.index(
    connection,
    {
      body: {
        search: searchFingerprint,
        created_at_from: oneDayAgo.toISOString(),
        created_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies ITodoAppGuest.IRequest,
    },
  );
  typia.assert(dateFilteredResults);
  // 7. Validate pagination metadata consistency across queries
  TestValidator.predicate(
    "allGuests pages calculated correctly",
    allGuests.pagination.pages ===
      Math.ceil(allGuests.pagination.records / allGuests.pagination.limit),
  );
  TestValidator.predicate(
    "searchResults pages calculated correctly",
    searchResults.pagination.pages ===
      Math.ceil(
        searchResults.pagination.records / searchResults.pagination.limit,
      ),
  );
}
