import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test popular feed retrieval accessible to guest users without authentication.
 *
 * This test verifies that the PATCH /redditClone/posts endpoint returns a
 * paginated list of posts from all communities across the platform. The endpoint
 * should be accessible without authentication credentials.
 *
 * Test flow:
 * 1. Call the popular feed endpoint with default pagination parameters
 * 2. Validate response structure matches IPageIRedditClonePost.ISummary
 * 3. Verify pagination metadata and posts array structure
 */
export async function test_api_post_popular_feed_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // Call popular feed endpoint as guest (no authentication required)
  const response: IPageIRedditClonePost.ISummary =
    await api.functional.redditClone.posts.index(connection, {
      body: {
        page: 1,
        limit: 20,
        sort: "hot",
      } satisfies IRedditClonePost.IRequest,
    });
  // Validate complete response structure including all nested types
  typia.assert(response);
  // Validate pagination relationships (business logic, not type checking)
  TestValidator.predicate(
    "pages calculated correctly",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
  TestValidator.predicate(
    "current page within bounds",
    response.pagination.current <= response.pagination.pages ||
      response.pagination.pages === 0,
  );
  // Validate posts array length doesn't exceed limit
  TestValidator.predicate(
    "posts count within limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate posts count doesn't exceed total records
  TestValidator.predicate(
    "posts count within total records",
    response.data.length <= response.pagination.records,
  );
}
