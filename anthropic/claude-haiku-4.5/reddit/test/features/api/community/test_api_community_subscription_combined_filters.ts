import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Test subscription list with filter parameters and pagination.
 *
 * Validates that the community subscription listing API correctly accepts
 * filter parameters, pagination controls, and returns paginated results with
 * proper structure. This test verifies the API contract and response format
 * since subscription data is managed by the system.
 *
 * Workflow:
 *
 * 1. Authenticate as member (creator)
 * 2. Create a category for the community
 * 3. Create a community
 * 4. Call subscription list with various filter combinations
 * 5. Verify response structure and pagination info
 * 6. Validate filter parameter acceptance
 * 7. Test pagination with different page sizes
 */
export async function test_api_community_subscription_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member (community creator)
  const creatorEmail = `creator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "http://localhost/join",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorMember);

  // Step 2: Create a category for community classification
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {},
  };
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConnection, {
      body: {
        email: adminEmail,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        name: "Test Administrator",
        href: "http://localhost/admin-join",
        referrer: "http://localhost/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: `Technology_${RandomGenerator.alphaNumeric(4)}`,
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Test technology category",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `TestCommunity_${RandomGenerator.alphaNumeric(4)}`,
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for testing subscription filters",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Test subscription listing with combined filters
  // Test basic filter combination: username + karma + date range
  const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const baseQuery = {
    page: 1,
    limit: 20,
    search_username: "alice",
    min_karma: 50,
    subscribed_from: recentDate.toISOString(),
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const result: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: baseQuery,
      },
    );
  typia.assert(result);

  // Step 5: Verify response structure
  TestValidator.predicate(
    "response should have pagination property",
    () => result.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination should have current page",
    () => result.pagination.current >= 1,
  );

  TestValidator.predicate(
    "pagination should have limit",
    () => result.pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination should have total records count",
    () => result.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination should have pages count",
    () => result.pagination.pages >= 1,
  );

  TestValidator.predicate("response should have data array", () =>
    Array.isArray(result.data),
  );

  // Step 6: Validate filter parameter acceptance
  // Test with only username filter
  const usernameOnlyQuery = {
    page: 1,
    limit: 20,
    search_username: "bob",
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const usernameResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: usernameOnlyQuery,
      },
    );
  typia.assert(usernameResult);

  TestValidator.predicate(
    "username filter should be accepted",
    () => usernameResult.pagination !== undefined,
  );

  // Test with only karma filter
  const karmaOnlyQuery = {
    page: 1,
    limit: 20,
    min_karma: 100,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const karmaResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: karmaOnlyQuery,
      },
    );
  typia.assert(karmaResult);

  TestValidator.predicate(
    "karma filter should be accepted",
    () => karmaResult.pagination !== undefined,
  );

  // Test with date range filters
  const dateRangeQuery = {
    page: 1,
    limit: 20,
    subscribed_from: recentDate.toISOString(),
    subscribed_to: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const dateRangeResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: dateRangeQuery,
      },
    );
  typia.assert(dateRangeResult);

  TestValidator.predicate(
    "date range filters should be accepted",
    () => dateRangeResult.pagination !== undefined,
  );

  // Step 7: Test pagination with different page sizes
  const smallPageQuery = {
    page: 1,
    limit: 5,
    min_karma: 0,
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const smallPageResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: smallPageQuery,
      },
    );
  typia.assert(smallPageResult);

  TestValidator.predicate(
    "pagination limit should be respected",
    () => smallPageResult.data.length <= 5,
  );

  TestValidator.equals(
    "page number should match request",
    smallPageResult.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should match request",
    smallPageResult.pagination.limit,
    5,
  );

  // Test with all filters combined (the core scenario)
  const allFiltersQuery = {
    page: 1,
    limit: 20,
    search_username: "user",
    min_karma: 25,
    subscribed_from: new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    sort_by: "newest",
  } satisfies ICommunityPlatformCommunitySubscription.IRequest;

  const allFiltersResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: allFiltersQuery,
      },
    );
  typia.assert(allFiltersResult);

  TestValidator.predicate(
    "all combined filters should be accepted and return valid results",
    () =>
      allFiltersResult.pagination !== undefined &&
      Array.isArray(allFiltersResult.data),
  );
}
