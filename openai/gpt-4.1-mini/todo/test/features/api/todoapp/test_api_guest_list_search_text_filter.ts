import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
/**
 * Performs an end-to-end test on the PATCH /todoApp/guests API endpoint.
 *
 * The test verifies that the API properly filters guest users by a free-text
 * search string, returning only guests whose guest_identifier contains the
 * searchText.
 *
 * The test also ensures that the returned page includes correct pagination
 * attributes such as current page, limit, total records, and total pages.
 *
 * This test runs unauthenticated as guests data is public. It tests the
 * response structure and its conformance to the filtering criteria.
 */
export async function test_api_guest_list_search_text_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Construct a random searchText string to filter guests
  const searchText: string = RandomGenerator.alphabets(5);
  // Step 2: Define pagination parameters
  const page: number = 1;
  const limit: number = 10;
  // Step 3: Prepare request body with pagination and searchText filter
  const requestBody = {
    page,
    limit,
    searchText,
  } satisfies ITodoAppGuest.IRequest;
  // Step 4: Call the PATCH /todoApp/guests endpoint
  const response: IPageITodoAppGuest.ISummary =
    await api.functional.todoApp.guests.index(connection, {
      body: requestBody,
    });
  // Step 5: Validate response structure and type
  typia.assert(response);
  // Step 6: Validate pagination attributes are logical and valid
  TestValidator.predicate(
    "pagination current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // Step 7: Validate each guest summary's guest_identifier contains searchText
  for (const guest of response.data) {
    TestValidator.predicate(
      `guest id '${guest.id}' identifier contains search filter string`,
      guest.guest_identifier.includes(searchText),
    );
  }
}
