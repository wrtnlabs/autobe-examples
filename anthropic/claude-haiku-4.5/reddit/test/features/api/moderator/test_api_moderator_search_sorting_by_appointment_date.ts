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
 * Test sorting moderators by appointment date (appointedAt field) in both
 * ascending and descending order.
 *
 * Administrator retrieves moderators for a community and verifies that results
 * are properly ordered by appointment date. Tests both asc and desc sort
 * directions to ensure chronological ordering works correctly for determining
 * moderator seniority and hierarchy.
 *
 * Test workflow:
 *
 * 1. Create administrator account for authorized access
 * 2. Create category for community setup
 * 3. Create community as member (member becomes creator/first moderator)
 * 4. Query moderators with ascending sort by appointment date
 * 5. Verify results are ordered correctly (oldest to newest)
 * 6. Query moderators with descending sort by appointment date
 * 7. Verify results are ordered correctly (newest to oldest)
 * 8. Validate that sorting works alongside pagination and other filters
 */
export async function test_api_moderator_search_sorting_by_appointment_date(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = "admin_" + RandomGenerator.alphaNumeric(8) + "@test.com";
  const adminCreateData = {
    email: adminEmail,
    password: "SecurePass123!Abc",
    username: "admin_" + RandomGenerator.alphaNumeric(6),
    name: "Test Administrator",
    href: "http://localhost:3000/admin/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminUser = await api.functional.auth.administrator.join(connection, {
    body: adminCreateData,
  });
  typia.assert(adminUser);
  TestValidator.equals("admin user has id", typeof adminUser.id, "string");

  // 2. Create category
  const categorySlug = "tech_" + RandomGenerator.alphaNumeric(4);
  const categoryData = {
    name: "Technology",
    slug: categorySlug,
    description: "Technology discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);
  TestValidator.equals("category has id", typeof category.id, "string");

  // 3. Create member account
  const memberEmail = "member_" + RandomGenerator.alphaNumeric(8) + "@test.com";
  const memberCreateData = {
    email: memberEmail,
    username: "member_" + RandomGenerator.alphaNumeric(6),
    password: "SecurePass123!Abc",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberUser = await api.functional.auth.member.join(connection, {
    body: memberCreateData,
  });
  typia.assert(memberUser);
  TestValidator.equals("member user has id", typeof memberUser.id, "string");

  // 4. Create community as member
  const communityIdentifier = "comm_" + RandomGenerator.alphaNumeric(6);
  const communityData = {
    name: "Technology Community",
    identifier: communityIdentifier,
    description: "Community for technology discussions and sharing",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: categorySlug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals("community has id", typeof community.id, "string");
  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );

  // 5. Query moderators with ascending sort by appointment date
  const ascendingRequest = {
    page: 1,
    limit: 10,
    orderBy: "appointedAt" as const,
    order: "asc" as const,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const ascendingResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingResults);
  TestValidator.equals(
    "ascending results include pagination",
    typeof ascendingResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "ascending results data is array",
    Array.isArray(ascendingResults.data),
  );
  TestValidator.predicate(
    "ascending has at least creator as moderator",
    ascendingResults.data.length >= 1,
  );

  // 6. Verify ascending order - appointments in chronological order (oldest to newest)
  if (ascendingResults.data.length > 1) {
    for (let i = 0; i < ascendingResults.data.length - 1; i++) {
      const currentTime = new Date(
        ascendingResults.data[i].appointed_at,
      ).getTime();
      const nextTime = new Date(
        ascendingResults.data[i + 1].appointed_at,
      ).getTime();
      TestValidator.predicate(
        `moderator at index ${i} appointment is before or equal to index ${i + 1} in ascending order`,
        currentTime <= nextTime,
      );
    }
  }

  // 7. Query moderators with descending sort by appointment date
  const descendingRequest = {
    page: 1,
    limit: 10,
    orderBy: "appointedAt" as const,
    order: "desc" as const,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const descendingResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: descendingRequest,
      },
    );
  typia.assert(descendingResults);
  TestValidator.equals(
    "descending results include pagination",
    typeof descendingResults.pagination,
    "object",
  );
  TestValidator.predicate(
    "descending results data is array",
    Array.isArray(descendingResults.data),
  );

  // 8. Verify descending order - appointments in reverse chronological order (newest to oldest)
  if (descendingResults.data.length > 1) {
    for (let i = 0; i < descendingResults.data.length - 1; i++) {
      const currentTime = new Date(
        descendingResults.data[i].appointed_at,
      ).getTime();
      const nextTime = new Date(
        descendingResults.data[i + 1].appointed_at,
      ).getTime();
      TestValidator.predicate(
        `moderator at index ${i} appointment is after or equal to index ${i + 1} in descending order`,
        currentTime >= nextTime,
      );
    }
  }

  // 9. Verify pagination with sorting
  const paginatedRequest = {
    page: 1,
    limit: 2,
    orderBy: "appointedAt" as const,
    order: "asc" as const,
  } satisfies ICommunityPlatformCommunityModerator.IRequest;

  const paginatedResults =
    await api.functional.communityPlatform.administrator.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: paginatedRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "pagination respects limit in sorted results",
    paginatedResults.data.length <= 2,
  );
  TestValidator.equals(
    "pagination current page value is 1",
    paginatedResults.pagination.current,
    1,
  );

  // 10. Verify sorting consistency across requests
  if (ascendingResults.data.length > 0 && descendingResults.data.length > 0) {
    TestValidator.equals(
      "ascending and descending return same number of moderators",
      ascendingResults.data.length,
      descendingResults.data.length,
    );

    // Verify first ascending is last descending (reverse order)
    TestValidator.equals(
      "first in ascending matches last in descending",
      ascendingResults.data[0].id,
      descendingResults.data[descendingResults.data.length - 1].id,
    );
  }
}
