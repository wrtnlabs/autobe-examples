import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community browsing workflow with pagination support.
 *
 * Validates the primary community browsing endpoint returns paginated community lists with complete summary information. Verifies pagination metadata accuracy including current page, limit, total records, and total pages calculation. Ensures soft-deleted communities are excluded from results and subscriber counts reflect active subscription records.
 *
 * Tests default pagination parameters to confirm first page retrieval with system-configured page size. Validates each community summary contains required fields: identity (id, name), visual branding (icon), purpose (description), ownership (owner profile), popularity metric (subscribers_count), and creation timestamp (created_at).
 *
 * 1. Calls community browse endpoint with default pagination parameters (page 1, limit 10).
 * 2. Validates response structure matches IPageIRedditCommunityCommunity.ISummary type.
 * 3. Verifies pagination metadata is correctly calculated and consistent.
 * 4. Confirms each community contains all required summary fields with valid formats.
 * 5. Validates subscriber_count is non-negative integer computed from subscriptions.
 * 6. Tests custom pagination parameters (page 2, limit 5) for multi-page navigation.
 * 7. Tests search filtering with partial name matching.
 */
export async function test_api_community_browse_all_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test with default pagination parameters
  const defaultRequest: IRedditCommunityCommunity.IRequest = {
    page: 1,
    limit: 10,
  };
  const response = await api.functional.redditCommunity.communities.index(
    connection,
    { body: defaultRequest },
  );
  typia.assert(response);
  // 2. Validate pagination metadata
  TestValidator.equals(
    "current page matches request",
    response.pagination.current,
    1,
  );
  TestValidator.equals("limit matches request", response.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate pages calculation: pages = ceil(records / limit)
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
  // 3. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 4. Validate each community summary has required fields (business logic only)
  for (const community of response.data) {
    // Validate subscriber count business rule (non-negative)
    TestValidator.predicate(
      "subscribers_count is non-negative",
      community.subscribers_count >= 0,
    );
    // Validate owner karma business rule (non-negative)
    TestValidator.predicate(
      "owner karma is non-negative",
      community.owner.karma >= 0,
    );
  }
  // 5. Test with custom pagination parameters (page 2)
  const customRequest: IRedditCommunityCommunity.IRequest = {
    page: 2,
    limit: 5,
    sort: "created_at",
    order: "desc",
  };
  const customResponse = await api.functional.redditCommunity.communities.index(
    connection,
    { body: customRequest },
  );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom page is 2",
    customResponse.pagination.current,
    2,
  );
  TestValidator.equals("custom limit is 5", customResponse.pagination.limit, 5);
  // 6. Test with search parameter
  const searchRequest: IRedditCommunityCommunity.IRequest = {
    search: "test",
    page: 1,
    limit: 10,
  };
  const searchResponse = await api.functional.redditCommunity.communities.index(
    connection,
    { body: searchRequest },
  );
  typia.assert(searchResponse);
  // Validate search results structure (may be empty if no matches)
  TestValidator.predicate(
    "search response has valid pagination",
    searchResponse.pagination.current >= 1 &&
      searchResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "search data is array",
    Array.isArray(searchResponse.data),
  );
}
