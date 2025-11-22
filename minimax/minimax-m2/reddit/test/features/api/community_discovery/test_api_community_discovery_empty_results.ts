import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

/**
 * Test community discovery API with empty result sets.
 *
 * This test validates the platform's behavior when community searches return no
 * matches, ensuring proper handling of empty result scenarios with appropriate
 * pagination and user feedback. Tests multiple empty result scenarios including
 * non-existent search terms, restrictive filters, and edge case search
 * patterns.
 *
 * The test creates a minimal set of communities with known characteristics,
 * then performs searches that are guaranteed to return empty results to
 * validate the API's empty state handling and response structure.
 */
export async function test_api_community_discovery_empty_results(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user for community discovery testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${typia.random<string & tags.Pattern<"^[a-zA-Z0-9_]+$">>()}`,
        email: userEmail,
        password: "TestPassword123!",
        display_name: "Test User",
        href: "https://test.example.com/register",
        referrer: "https://test.example.com/home",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Create a few communities with specific, predictable characteristics
  const techCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "technology_discussion",
          title: "Technology Discussion",
          description:
            "A community for discussing technology trends and innovations",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(techCommunity);

  const scienceCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "science_research",
          title: "Science Research Hub",
          description: "Latest scientific discoveries and research discussions",
          type: "public",
          allow_text_posts: true,
          allow_link_posts: true,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: false,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(scienceCommunity);

  const artCommunity: IRedditPlatformCommunity =
    await api.functional.redditPlatform.registeredUser.communities.create(
      connection,
      {
        body: {
          name: "digital_artists",
          title: "Digital Artists Unite",
          description: "Share and discuss digital art, tools, and techniques",
          type: "restricted",
          allow_text_posts: true,
          allow_link_posts: false,
          allow_image_posts: true,
          require_post_approval: false,
          require_comment_approval: true,
          nsfw_content_allowed: false,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(artCommunity);

  // Step 3: Test multiple empty result scenarios

  // Scenario 3.1: Search for completely non-existent community name
  const emptySearchResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          search: "nonexistentcommunity12345",
          limit: 10,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(emptySearchResult);

  // Validate empty search result structure
  TestValidator.equals(
    "empty search returns zero data",
    emptySearchResult.data,
    [],
  );
  TestValidator.equals(
    "empty search shows zero total records",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search shows zero total pages",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search maintains requested limit",
    emptySearchResult.pagination.limit,
    10,
  );

  // Scenario 3.2: Search with restrictive filters that don't match any communities
  const filteredEmptyResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          type: "private", // We only created public/restricted communities
          status: "banned", // We only created active communities
          allow_image_posts: true, // science community doesn't allow images
          require_post_approval: true, // tech community doesn't require approval
          nsfw_content_allowed: true, // None of our communities allow NSFW
          limit: 5,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(filteredEmptyResult);

  // Validate filtered empty result structure
  TestValidator.equals(
    "filtered empty result has zero data",
    filteredEmptyResult.data,
    [],
  );
  TestValidator.equals(
    "filtered empty result shows zero records",
    filteredEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered empty result shows zero pages",
    filteredEmptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "filtered empty result maintains requested limit",
    filteredEmptyResult.pagination.limit,
    5,
  );

  // Scenario 3.3: Search with specific title that doesn't exist
  const titleSearchEmptyResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          title: "Quantum Physics Discussion Forum",
          limit: 20,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(titleSearchEmptyResult);

  // Validate title search empty result
  TestValidator.equals(
    "title search empty result has no data",
    titleSearchEmptyResult.data,
    [],
  );
  TestValidator.equals(
    "title search shows zero records",
    titleSearchEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "title search shows zero pages",
    titleSearchEmptyResult.pagination.pages,
    0,
  );

  // Scenario 3.4: Test pagination with empty results (try to access page 2 of empty results)
  const paginatedEmptyResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          search: "definitely_not_matching_anything",
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(paginatedEmptyResult);

  // Validate pagination behavior with empty results
  TestValidator.equals(
    "paginated empty result has no data",
    paginatedEmptyResult.data,
    [],
  );
  TestValidator.equals(
    "paginated empty result shows zero records",
    paginatedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated empty result shows correct page number",
    paginatedEmptyResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated empty result shows zero total pages",
    paginatedEmptyResult.pagination.pages,
    0,
  );

  // Scenario 3.5: Test with member count filters that exclude all communities
  const memberCountEmptyResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          min_member_count: 1000, // Much higher than our new communities
          max_member_count: 1, // Much lower than our communities
          limit: 15,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(memberCountEmptyResult);

  // Validate member count filter empty result
  TestValidator.equals(
    "member count filtered empty result has no data",
    memberCountEmptyResult.data,
    [],
  );
  TestValidator.equals(
    "member count filtered shows zero records",
    memberCountEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "member count filtered shows zero pages",
    memberCountEmptyResult.pagination.pages,
    0,
  );

  // Scenario 3.6: Combined restrictive search (very unlikely to match)
  const combinedRestrictiveEmptyResult: IPageIRedditPlatformCommunity.ISummary =
    await api.functional.redditPlatform.registeredUser.communities.index(
      connection,
      {
        body: {
          search: "minecraft_modding_cooking_recipes",
          type: "private",
          allow_text_posts: false,
          allow_link_posts: false,
          allow_image_posts: false,
          require_post_approval: true,
          require_comment_approval: true,
          nsfw_content_allowed: true,
          min_subscriber_count: 500,
          limit: 25,
        } satisfies IRedditPlatformCommunity.IRequest,
      },
    );
  typia.assert(combinedRestrictiveEmptyResult);

  // Validate combined restrictive empty result
  TestValidator.equals(
    "combined restrictive empty result has no data",
    combinedRestrictiveEmptyResult.data,
    [],
  );
  TestValidator.equals(
    "combined restrictive shows zero records",
    combinedRestrictiveEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined restrictive shows zero pages",
    combinedRestrictiveEmptyResult.pagination.pages,
    0,
  );

  // Final validation: Ensure all empty results maintain proper response structure
  const allEmptyResults = [
    emptySearchResult,
    filteredEmptyResult,
    titleSearchEmptyResult,
    paginatedEmptyResult,
    memberCountEmptyResult,
    combinedRestrictiveEmptyResult,
  ];

  allEmptyResults.forEach((result, index) => {
    // Ensure each result has proper pagination structure
    TestValidator.equals(
      `empty result ${index} has valid pagination`,
      typeof result.pagination.current === "number" &&
        typeof result.pagination.limit === "number" &&
        typeof result.pagination.records === "number" &&
        typeof result.pagination.pages === "number",
      true,
    );

    // Ensure pagination values are non-negative
    TestValidator.predicate(
      `empty result ${index} pagination values are non-negative`,
      result.pagination.current >= 0 &&
        result.pagination.limit >= 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );

    // Ensure data array exists and is empty
    TestValidator.equals(
      `empty result ${index} data is empty array`,
      result.data,
      [],
    );
  });
}
