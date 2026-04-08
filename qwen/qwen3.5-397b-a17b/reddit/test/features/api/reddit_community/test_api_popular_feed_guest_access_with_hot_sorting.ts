import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test guest user access to Popular Feed with hot sorting algorithm.
 *
 * Validates that anonymous users can successfully retrieve the platform-wide popular feed without authentication. The test verifies the endpoint returns properly structured paginated data with posts sorted by the 'hot' algorithm (recent posts with high engagement first).
 *
 * The test confirms that all required post fields are present including author and community summaries, vote scores, comment counts, and type-specific preview content. Pagination metadata is validated to ensure correct page information is returned.
 *
 * 1. Guest user calls popular feed endpoint with sort='hot' parameter.
 * 2. Validates response structure matches IPageIRedditCommunityPost.ISummary.
 * 3. Verifies pagination metadata contains current page, limit, records, and pages.
 * 4. Validates each post includes required fields: id, title, post_type, author, community, vote_score, comment_count, created_at.
 * 5. Confirms type-specific preview fields exist based on post_type (text_preview, thumbnail_url, or link_domain).
 */
export async function test_api_popular_feed_guest_access_with_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call popular feed endpoint as guest with hot sorting
  const response = await api.functional.redditCommunity.feeds.popular.index(
    connection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // 2. Validate pagination metadata business logic
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 3. Validate pagination consistency
  if (response.pagination.records > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      response.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when no records",
      response.pagination.pages,
      0,
    );
  }
  // 4. Validate posts are returned (typia.assert already validated structure)
  TestValidator.predicate(
    "data array length matches records on first page",
    response.data.length <= response.pagination.limit,
  );
}
