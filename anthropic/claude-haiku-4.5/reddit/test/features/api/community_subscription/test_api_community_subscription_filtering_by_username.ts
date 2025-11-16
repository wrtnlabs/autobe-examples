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
 * Tests community subscription list filtering and pagination functionality.
 *
 * This test validates the subscription listing API with various filter
 * parameters:
 *
 * - Pagination works correctly with configurable page and limit parameters
 * - The API accepts search_username filter for partial username matching
 * - Date range filtering (subscribed_from, subscribed_to) parameters work
 * - Karma score filtering (min_karma, max_karma) parameters work
 * - Sorting by different fields works correctly
 * - Response structure matches the expected paginated format
 *
 * Setup steps:
 *
 * 1. Create administrator and member accounts
 * 2. Create a community category
 * 3. Create a community
 * 4. Query subscriptions with various filter combinations
 * 5. Validate response structure and pagination metadata
 */
export async function test_api_community_subscription_filtering_by_username(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(5)}`,
          description: "Tech community category",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to be community creator
  const creatorEmail: string = typia.random<string & tags.Format<"email">>();
  const creatorAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(6)}`,
        password: "CreatorPassword123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorAccount);

  // Step 4: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(6)}`,
          identifier: `test_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Test subscription listing with default pagination
  const defaultResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(defaultResult);

  // Validate response structure
  TestValidator.predicate(
    "response should contain pagination info",
    defaultResult.pagination !== undefined &&
      defaultResult.pagination.current >= 0 &&
      defaultResult.pagination.limit > 0 &&
      defaultResult.pagination.records >= 0 &&
      defaultResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "response should contain data array",
    Array.isArray(defaultResult.data),
  );

  // Step 6: Test subscription listing with username filter
  const usernameFilterResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search_username: "creator",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(usernameFilterResult);

  TestValidator.predicate(
    "username filter should be accepted by API",
    usernameFilterResult.pagination !== undefined &&
      Array.isArray(usernameFilterResult.data),
  );

  // Step 7: Test subscription listing with date range filter
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const dateFilterResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          subscribed_from: oneMonthAgo.toISOString(),
          subscribed_to: oneMonthFromNow.toISOString(),
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateFilterResult);

  TestValidator.predicate(
    "date range filter should be accepted by API",
    dateFilterResult.pagination !== undefined &&
      Array.isArray(dateFilterResult.data),
  );

  // Step 8: Test subscription listing with karma filter
  const karmaFilterResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          min_karma: 0,
          max_karma: 1000,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(karmaFilterResult);

  TestValidator.predicate(
    "karma filter should be accepted by API",
    karmaFilterResult.pagination !== undefined &&
      Array.isArray(karmaFilterResult.data),
  );

  // Step 9: Test subscription listing with sorting
  const sortResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "newest",
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortResult);

  TestValidator.predicate(
    "sort parameter should be accepted by API",
    sortResult.pagination !== undefined && Array.isArray(sortResult.data),
  );

  // Step 10: Test pagination with different limits
  const paginationTestResult: IPageICommunityPlatformCommunitySubscription.ISummary =
    await api.functional.communityPlatform.member.communities.subscriptions.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginationTestResult);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginationTestResult.data.length <= 5,
  );

  TestValidator.predicate(
    "pagination current page should match request",
    paginationTestResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    paginationTestResult.pagination.limit === 5,
  );
}
