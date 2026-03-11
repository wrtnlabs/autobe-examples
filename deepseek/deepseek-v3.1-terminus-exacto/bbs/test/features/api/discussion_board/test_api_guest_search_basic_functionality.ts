import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the basic search functionality of the guest accounts endpoint.
 * Verify that the search operation returns a paginated list of guest accounts
 * with proper structure. Validate that the response includes essential guest
 * information (id, device_fingerprint, created_at) and pagination metadata.
 * Test the endpoint with minimal search criteria to ensure it returns all
 * available guest accounts when no specific filters are applied.
 */
export async function test_api_guest_search_basic_functionality(
  connection: api.IConnection,
): Promise<void> {
  // Create search request with minimal criteria to retrieve all guest accounts
  const searchRequest: IDiscussionBoardGuest.IRequest = {
    // Empty request to get all available guest accounts
  } satisfies IDiscussionBoardGuest.IRequest;
  // Execute the search operation
  const response = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: searchRequest,
    },
  );
  // Validate complete response structure using typia
  typia.assert(response);
  // Validate pagination calculations (if records and limit are positive)
  if (response.pagination.records > 0 && response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages should be calculated correctly",
      response.pagination.pages,
      expectedPages,
    );
  }
  // Validate that current page is within valid range
  if (response.pagination.pages > 0) {
    TestValidator.predicate(
      "current page should be within valid range",
      response.pagination.current >= 1 &&
        response.pagination.current <= response.pagination.pages,
    );
  }
  // Validate that data array length does not exceed limit
  TestValidator.predicate(
    "data array should not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );
}
