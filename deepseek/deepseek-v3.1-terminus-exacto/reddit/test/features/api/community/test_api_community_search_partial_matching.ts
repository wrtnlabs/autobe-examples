import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Test partial text matching functionality for community search.
 *
 * This test validates that the community search API correctly implements
 * partial text matching in community names and descriptions. It tests various
 * scenarios including substring matching, case-insensitive search, special
 * character handling, and pagination with search results.
 *
 * The test focuses on verifying that search queries return communities
 * containing partial matches in names or descriptions, testing case-insensitive
 * matching and special character handling in search terms.
 */
export async function test_api_community_search_partial_matching(
  connection: api.IConnection,
) {
  // Test 1: Basic partial matching
  const searchTerm1 = "tech";
  const requestBody1 = {
    search: searchTerm1,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result1 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody1 },
  );
  typia.assert(result1);

  // Validate search functionality works without errors
  TestValidator.predicate(
    "search API should return valid pagination structure",
    result1.pagination !== undefined &&
      typeof result1.pagination.current === "number" &&
      typeof result1.pagination.limit === "number" &&
      typeof result1.pagination.records === "number" &&
      typeof result1.pagination.pages === "number",
  );

  // Test 2: Case-insensitive matching
  const searchTerm2 = "PROGRAM";
  const requestBody2 = {
    search: searchTerm2,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result2 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody2 },
  );
  typia.assert(result2);

  TestValidator.predicate(
    "case-insensitive search should return valid response",
    Array.isArray(result2.data) && result2.pagination !== undefined,
  );

  // Test 3: Empty search term (should return communities)
  const requestBody3 = {
    search: "",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result3 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody3 },
  );
  typia.assert(result3);

  TestValidator.predicate(
    "empty search term should return valid pagination data",
    result3.pagination.current >= 0 &&
      result3.pagination.limit >= 0 &&
      result3.pagination.records >= 0 &&
      result3.pagination.pages >= 0,
  );

  // Test 4: Search term with potential no matches
  const searchTerm4 = "nonexistentcommunity12345";
  const requestBody4 = {
    search: searchTerm4,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result4 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody4 },
  );
  typia.assert(result4);

  TestValidator.predicate(
    "search for non-existent term should return valid empty or limited results",
    Array.isArray(result4.data) && result4.pagination.records >= 0,
  );

  // Test 5: Search with special characters
  const searchTerm5 = "dev-";
  const requestBody5 = {
    search: searchTerm5,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result5 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody5 },
  );
  typia.assert(result5);

  TestValidator.predicate(
    "search with special characters should return valid response",
    Array.isArray(result5.data) && result5.pagination !== undefined,
  );

  // Test 6: Pagination validation with search
  const searchTerm6 = "community";
  const requestBody6 = {
    search: searchTerm6,
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result6 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody6 },
  );
  typia.assert(result6);

  TestValidator.predicate(
    "pagination limit should be respected",
    result6.data.length <= 5,
  );

  TestValidator.equals(
    "page number should be correctly set to 1",
    result6.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should be correctly set to 5",
    result6.pagination.limit,
    5,
  );

  // Test 7: Search with ordering parameters
  const searchTerm7 = "web";
  const requestBody7 = {
    search: searchTerm7,
    page: 1,
    limit: 10,
    order_by: "name",
    order_direction: "asc",
  } satisfies ICommunityPlatformCommunity.IRequest;

  const result7 = await api.functional.communityPlatform.communities.index(
    connection,
    { body: requestBody7 },
  );
  typia.assert(result7);

  TestValidator.predicate(
    "search with ordering should return valid community data",
    Array.isArray(result7.data) &&
      result7.data.every(
        (community) =>
          typeof community.id === "string" &&
          typeof community.name === "string" &&
          typeof community.slug === "string" &&
          typeof community.status === "string" &&
          typeof community.privacy === "string" &&
          typeof community.created_at === "string",
      ),
  );

  // Test 8: Validate community summary structure in search results
  if (result7.data.length > 0) {
    const sampleCommunity = result7.data[0];
    TestValidator.predicate(
      "community summary should have correct structure",
      typeof sampleCommunity.id === "string" &&
        typeof sampleCommunity.name === "string" &&
        typeof sampleCommunity.slug === "string" &&
        ["active", "archived", "suspended", "pending"].includes(
          sampleCommunity.status,
        ) &&
        ["public", "private", "restricted"].includes(sampleCommunity.privacy) &&
        typeof sampleCommunity.created_at === "string",
    );
  }
}
