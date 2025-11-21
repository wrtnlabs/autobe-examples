import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test basic community search functionality with minimal parameters.
 *
 * Validates that the search endpoint returns a paginated list of communities
 * when provided with basic search criteria. Tests default pagination behavior,
 * empty search query handling, and proper response structure with pagination
 * metadata.
 */
export async function test_api_community_search_basic(
  connection: api.IConnection,
) {
  // Test 1: Empty request body (all optional parameters omitted)
  const emptyResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {} satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(emptyResponse);

  TestValidator.predicate(
    "empty request returns valid pagination structure",
    emptyResponse.pagination.current >= 0 &&
      emptyResponse.pagination.limit > 0 &&
      emptyResponse.pagination.records >= 0 &&
      emptyResponse.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data array matches pagination records",
    emptyResponse.data.length <= emptyResponse.pagination.limit,
  );

  // Validate community summary structure
  if (emptyResponse.data.length > 0) {
    const community = emptyResponse.data[0];
    TestValidator.predicate(
      "community has required properties",
      typeof community.id === "string" &&
        typeof community.name === "string" &&
        typeof community.slug === "string" &&
        typeof community.status === "string" &&
        typeof community.privacy === "string" &&
        typeof community.created_at === "string",
    );
  }

  // Test 2: Basic pagination parameters
  const paginationResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(paginationResponse);

  TestValidator.equals(
    "pagination page matches request",
    paginationResponse.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit matches request",
    paginationResponse.pagination.limit,
    10,
  );

  // Test 3: Search query parameter
  const searchResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: RandomGenerator.paragraph({ sentences: 2 }),
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(searchResponse);

  TestValidator.predicate(
    "search response has valid pagination",
    searchResponse.pagination.current === 1 &&
      searchResponse.pagination.limit === 5,
  );

  // Test 4: Status and privacy filters with proper type assertions
  const statuses = ["active", "archived", "suspended", "pending"] as const;
  const privacies = ["public", "private", "restricted"] as const;

  const statusResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        status: RandomGenerator.pick(statuses) satisfies string as string,
        privacy: RandomGenerator.pick(privacies) satisfies string as string,
        page: 1,
        limit: 8,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(statusResponse);

  TestValidator.equals(
    "status filter response has correct pagination",
    statusResponse.pagination.limit,
    8,
  );

  // Test 5: Ordering parameters
  const orderResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        order_by: "created_at",
        order_direction: "desc",
        page: 1,
        limit: 6,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(orderResponse);

  TestValidator.predicate(
    "order response has valid structure",
    orderResponse.pagination.current === 1 &&
      orderResponse.pagination.limit === 6,
  );

  // Test 6: Category ID filter
  const categoryResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        limit: 4,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(categoryResponse);

  TestValidator.equals(
    "category filter response has correct limit",
    categoryResponse.pagination.limit,
    4,
  );

  // Test 7: Combined parameters
  const combinedResponse: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        search: RandomGenerator.paragraph({ sentences: 1 }),
        status: "active",
        privacy: "public",
        order_by: "name",
        order_direction: "asc",
        page: 1,
        limit: 12,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(combinedResponse);

  TestValidator.equals(
    "combined parameters response has correct limit",
    combinedResponse.pagination.limit,
    12,
  );

  // Validate pagination calculations
  TestValidator.predicate(
    "pagination pages calculation is reasonable",
    combinedResponse.pagination.pages ===
      Math.ceil(
        combinedResponse.pagination.records / combinedResponse.pagination.limit,
      ) || combinedResponse.pagination.pages === 0,
  );
}
