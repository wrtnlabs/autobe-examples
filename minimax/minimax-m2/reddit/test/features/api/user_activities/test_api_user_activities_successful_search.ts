import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

export async function test_api_user_activities_successful_search(
  connection: api.IConnection,
) {
  // Generate test user ID for activity search
  const userId = typia.random<string & tags.Format<"uuid">>();

  // Test successful search with default parameters (no filters, default pagination)
  const searchResult =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {}, // Empty body for default parameters
    });

  // Validate the response structure and types
  typia.assert(searchResult);

  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination metadata exists",
    searchResult.pagination,
    searchResult.pagination,
  );

  // Validate pagination properties
  TestValidator.predicate(
    "pagination has required properties",
    searchResult.pagination.current >= 0 &&
      searchResult.pagination.limit >= 0 &&
      searchResult.pagination.records >= 0 &&
      searchResult.pagination.pages >= 0,
  );

  // Validate activities data array exists
  TestValidator.predicate(
    "activities data array exists",
    Array.isArray(searchResult.data),
  );

  // Test with default pagination parameters
  TestValidator.equals("default page is 1", searchResult.pagination.current, 1);

  TestValidator.equals(
    "default limit is 20",
    searchResult.pagination.limit,
    20,
  );

  // If activities are returned, validate their structure
  if (searchResult.data.length > 0) {
    const firstActivity = searchResult.data[0];

    // Validate activity record structure matches ISummary schema
    TestValidator.predicate(
      "activity has ID",
      typeof firstActivity.id === "string" && firstActivity.id.length > 0,
    );

    TestValidator.predicate(
      "activity has type",
      typeof firstActivity.activity_type === "string" &&
        firstActivity.activity_type.length > 0,
    );

    TestValidator.predicate(
      "activity has description",
      typeof firstActivity.activity_description === "string" &&
        firstActivity.activity_description.length > 0,
    );

    TestValidator.predicate(
      "activity has timestamp",
      typeof firstActivity.created_at === "string" &&
        firstActivity.created_at.length > 0,
    );

    TestValidator.predicate(
      "activity has community ID",
      typeof firstActivity.target_community_id === "string" &&
        firstActivity.target_community_id.length > 0,
    );

    // Validate optional fields can exist
    TestValidator.predicate(
      "activity metadata is string or undefined",
      typeof firstActivity.activity_metadata === "string" ||
        firstActivity.activity_metadata === undefined,
    );

    TestValidator.predicate(
      "IP address is string or undefined",
      typeof firstActivity.ip_address === "string" ||
        firstActivity.ip_address === undefined,
    );

    TestValidator.predicate(
      "user agent is string or undefined",
      typeof firstActivity.user_agent === "string" ||
        firstActivity.user_agent === undefined,
    );

    // Validate timestamp format (ISO 8601)
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    TestValidator.predicate(
      "created_at follows ISO 8601 format",
      timestampRegex.test(firstActivity.created_at),
    );

    // Validate UUID format for IDs
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate(
      "activity ID is valid UUID",
      uuidRegex.test(firstActivity.id),
    );

    TestValidator.predicate(
      "community ID is valid UUID",
      uuidRegex.test(firstActivity.target_community_id),
    );
  }

  // Test with explicit default parameters to ensure consistency
  const explicitDefaultSearch =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        page: 1,
        limit: 20,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(explicitDefaultSearch);

  // Validate both calls return consistent pagination structure
  TestValidator.equals(
    "explicit default search has same page structure",
    searchResult.pagination.current,
    explicitDefaultSearch.pagination.current,
  );

  TestValidator.equals(
    "explicit default search has same limit",
    searchResult.pagination.limit,
    explicitDefaultSearch.pagination.limit,
  );

  // Test edge case with large page number to verify pagination logic
  const largePageSearch =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        page: 999999,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });

  typia.assert(largePageSearch);

  // Verify empty results don't break pagination
  TestValidator.predicate(
    "large page returns empty data with valid pagination",
    Array.isArray(largePageSearch.data) &&
      largePageSearch.data.length === 0 &&
      largePageSearch.pagination.current >= 0,
  );
}
