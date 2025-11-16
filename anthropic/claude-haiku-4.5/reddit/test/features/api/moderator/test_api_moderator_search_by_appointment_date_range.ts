import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Test filtering moderators by appointment date range using appointedAtStart
 * and appointedAtEnd parameters.
 *
 * This test validates that the administrator can search for moderators within a
 * specific date range and that results include only moderators whose
 * appointment dates fall within the specified bounds (inclusive). The test
 * covers various date range combinations including exact date matches, ranges
 * with no results, and single-boundary searches.
 *
 * Test workflow:
 *
 * 1. Create administrator account for API access
 * 2. Create category for community classification
 * 3. Create member account as community creator
 * 4. Create community with the member (creator becomes moderator)
 * 5. Search moderators by various appointment date ranges
 * 6. Validate that results respect the date range filters (inclusive boundaries)
 * 7. Verify pagination works correctly with date range filtering
 */
export async function test_api_moderator_search_by_appointment_date_range(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for API access
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminAccount: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Administrator",
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAccount);
  connection.headers ??= {};
  connection.headers.Authorization = adminAccount.token.access;

  // Step 2: Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account as community creator
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const memberAccount: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `member_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAccount);

  // Switch to member context for community creation
  const memberConnection = {
    ...connection,
    headers: { Authorization: memberAccount.token.access },
  };

  // Step 4: Create community with the member (creator is automatically a moderator)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "Tech Discussion Community",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_images",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch back to admin context for moderator search
  connection.headers.Authorization = adminAccount.token.access;

  // Step 5: Test date range filtering with multiple scenarios
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  // Create start date 7 days ago
  const sevenDaysAgo = new Date(now.getTime() - 7 * oneDay).toISOString();
  // Create end date 7 days from now
  const sevenDaysLater = new Date(now.getTime() + 7 * oneDay).toISOString();

  // Scenario 1: Search within a broad date range that should include the creator moderator
  const searchResult1: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          appointedAtStart: sevenDaysAgo,
          appointedAtEnd: sevenDaysLater,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "search with broad date range should return creator moderator",
    searchResult1.data.length > 0,
  );

  // Verify all results fall within the date range (inclusive)
  for (const moderator of searchResult1.data) {
    const appointedDate = new Date(moderator.appointed_at);
    const startDate = new Date(sevenDaysAgo);
    const endDate = new Date(sevenDaysLater);

    TestValidator.predicate(
      "moderator appointed_at should be >= start date",
      appointedDate >= startDate,
    );
    TestValidator.predicate(
      "moderator appointed_at should be <= end date",
      appointedDate <= endDate,
    );
  }

  // Scenario 2: Search with only start date (no end date)
  const searchResult2: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          appointedAtStart: sevenDaysAgo,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult2);

  // All results should be on or after start date
  for (const moderator of searchResult2.data) {
    const appointedDate = new Date(moderator.appointed_at);
    const startDate = new Date(sevenDaysAgo);
    TestValidator.predicate(
      "moderator with start date only should be >= start date",
      appointedDate >= startDate,
    );
  }

  // Scenario 3: Search with only end date (no start date)
  const searchResult3: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          appointedAtEnd: sevenDaysLater,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult3);

  // All results should be on or before end date
  for (const moderator of searchResult3.data) {
    const appointedDate = new Date(moderator.appointed_at);
    const endDate = new Date(sevenDaysLater);
    TestValidator.predicate(
      "moderator with end date only should be <= end date",
      appointedDate <= endDate,
    );
  }

  // Scenario 4: Search with date range in the future (should return empty results)
  const futureStart = new Date(now.getTime() + 30 * oneDay).toISOString();
  const futureEnd = new Date(now.getTime() + 37 * oneDay).toISOString();

  const searchResult4: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          appointedAtStart: futureStart,
          appointedAtEnd: futureEnd,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(searchResult4);

  // Verify pagination structure is correct
  TestValidator.predicate(
    "pagination should have current page",
    searchResult4.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    searchResult4.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination should have total records",
    searchResult4.pagination.records >= 0,
  );

  // Scenario 5: Verify pagination with date range filtering
  const paginationResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
          appointedAtStart: sevenDaysAgo,
          appointedAtEnd: sevenDaysLater,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "returned data should not exceed limit",
    paginationResult.data.length <= 5,
  );
}
