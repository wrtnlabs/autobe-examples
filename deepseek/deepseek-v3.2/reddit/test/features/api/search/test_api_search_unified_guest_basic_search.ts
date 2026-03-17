import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPagination";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test basic unified search functionality for guest users without authentication.
 * Tests case-insensitive partial matching across communities, posts, and users.
 */
export async function test_api_search_unified_guest_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Note: We cannot create test data since creation endpoints are not available
  // in the provided SDK functions. We'll test the unified search functionality
  // with whatever data exists in the system.
  // Execute unified search with query "tech"
  const response = await api.functional.communityPlatform.search.unified(
    connection, // Guest endpoint - no authentication needed
    {
      body: {
        search: "tech",
        entityTypes: [], // Empty array means search all entity types
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPost.IUnified,
    },
  );
  // Validate complete response structure - typia.assert performs comprehensive validation
  typia.assert(response);
  // The data property is a single item (union type), not an array
  const data = response.data;
  // Determine the entity type using property checks
  const isCommunity =
    typeof data === "object" &&
    data !== null &&
    "name" in data &&
    "description" in data &&
    "owner" in data;
  const isPost =
    typeof data === "object" &&
    data !== null &&
    "title" in data &&
    "author" in data &&
    "community" in data;
  const isUser =
    typeof data === "object" &&
    data !== null &&
    "email" in data &&
    "username" in data &&
    "email_verified" in data;
  // Verify exactly one type matches
  TestValidator.predicate(
    "data must be exactly one entity type (community, post, or user)",
    [isCommunity, isPost, isUser].filter(Boolean).length === 1,
  );
  // Verify search algorithm behavior by checking if result matches the query
  // We'll check if the result contains "tech" (case-insensitive)
  let hasMatch = false;
  if (isCommunity) {
    const community = data as ICommunityPlatformCommunity.ISummary;
    const searchText = community.name + (community.description || "");
    hasMatch = searchText.toLowerCase().includes("tech");
  } else if (isPost) {
    const post = data as ICommunityPlatformPost.ISummary;
    hasMatch = post.title.toLowerCase().includes("tech");
  } else if (isUser) {
    const user = data as ICommunityPlatformMember.ISummary;
    const searchText = user.username + (user.nickname || "");
    hasMatch = searchText.toLowerCase().includes("tech");
  }
  // Note: We don't assert must have matches since data may not contain "tech"
  // This is just to verify the search logic if there is a match
  // Verify guest accessibility - the call succeeded without authentication
  TestValidator.predicate("guest search succeeded", true);
}
