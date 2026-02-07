import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Perform GET request to popular feed endpoint (no authentication required)
  const response =
    await api.functional.redditPlatform.popular.index(connection);
  // Validate response structure with full type checking
  typia.assert<IPageIRedditPlatformPost.ISummary>(response);
  // Validate pagination metadata exists and has correct structure
  TestValidator.equals(
    "pagination object exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", response.data !== undefined, true);
  // Validate pagination fields are present and valid
  TestValidator.predicate(
    "current page is positive integer",
    typeof response.pagination.current === "number" &&
      response.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit is positive integer",
    typeof response.pagination.limit === "number" &&
      response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "record count is non-negative integer",
    typeof response.pagination.records === "number" &&
      response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative integer",
    typeof response.pagination.pages === "number" &&
      response.pagination.pages >= 0,
  );
  // Validate posts array is array type
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate pagination consistency: pages should be ceiling of records/limit
  if (response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation correct",
      response.pagination.pages,
      expectedPages,
    );
  }
  // Test pagination with custom parameters
  const firstPage =
    await api.functional.redditPlatform.popular.index(connection);
  typia.assert(firstPage);
  // Verify response structure is consistent
  TestValidator.equals(
    "response structure consistent",
    firstPage.data !== undefined,
    true,
  );
}
