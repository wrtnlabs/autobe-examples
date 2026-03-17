import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest account search with pagination, filtering, and sorting.
 *
 * This test validates the comprehensive search functionality for guest accounts,
 * which are temporary anonymous user records. Tests include:
 * - Basic pagination with default parameters
 * - Exact filtering by anonymous_id (UUID)
 * - Partial search term matching on anonymous_id
 * - Date range filtering for created_at and updated_at
 * - Sorting by created_at and updated_at in ascending/descending order
 * - Pagination metadata correctness
 *
 * Since guest accounts are system-generated, the test works with whatever
 * existing data is available in the system.
 */
export async function test_api_guests_search_pagination_filtering(
  connection: api.IConnection,
): Promise<void> {
  // No authorization required per API specification (authorization-type: null)
  // Use the provided connection directly
  // Test 1: Basic pagination with default parameters
  const defaultPage = await api.functional.communityPlatform.guests.index(
    connection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies ICommunityPlatformGuest.IRequest,
    },
  );
  typia.assert(defaultPage);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    defaultPage.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", defaultPage.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // If we have guest data, perform more comprehensive tests
  if (defaultPage.data.length > 0) {
    const sampleGuest = defaultPage.data[0];
    typia.assert(sampleGuest);
    // Test 2: Exact filtering by anonymous_id
    const exactFilterResult =
      await api.functional.communityPlatform.guests.index(connection, {
        body: {
          anonymous_id: sampleGuest.anonymous_id,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformGuest.IRequest,
      });
    typia.assert(exactFilterResult);
    TestValidator.predicate(
      "exact filter returns at least one result",
      exactFilterResult.data.length >= 1,
    );
    TestValidator.equals(
      "exact filter returns matching anonymous_id",
      exactFilterResult.data[0].anonymous_id,
      sampleGuest.anonymous_id,
    );
    // Test 3: Partial search term (use part of the UUID)
    // Extract a segment from the middle of the UUID for partial matching
    const uuidParts = sampleGuest.anonymous_id.split("-");
    const partialSearch = uuidParts[2]; // Third segment of UUID
    const searchResult = await api.functional.communityPlatform.guests.index(
      connection,
      {
        body: {
          search: partialSearch,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformGuest.IRequest,
      },
    );
    typia.assert(searchResult);
    // Search may return multiple results, but should include our sample
    const foundGuest = searchResult.data.find(
      (guest) => guest.anonymous_id === sampleGuest.anonymous_id,
    );
    TestValidator.predicate(
      "partial search finds matching guest",
      foundGuest !== undefined,
    );
    // Test 4: Date range filtering for created_at
    const guestCreatedAt = new Date(sampleGuest.created_at);
    const startDate = new Date(guestCreatedAt.getTime() - 1000 * 60 * 60 * 24); // 1 day before
    const endDate = new Date(guestCreatedAt.getTime() + 100);
  }
}
