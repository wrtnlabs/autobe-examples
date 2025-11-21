import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";

/**
 * Test member search pagination functionality where an administrator navigates
 * through multiple pages of search results.
 *
 * This test validates that pagination controls work correctly, including page
 * numbers, record limits, and total record counts. The test ensures that
 * pagination maintains search context across pages and that page boundaries are
 * properly handled without data loss or duplication.
 */
export async function test_api_member_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator with proper password format
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!"; // Generate secure password
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Perform initial search with default pagination
  const firstPage = await api.functional.communityPlatform.admin.members.index(
    connection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    },
  );
  typia.assert(firstPage);

  // Validate pagination metadata
  TestValidator.equals(
    "pagination metadata should be present",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Handle pagination calculation validation with edge cases
  if (firstPage.pagination.records > 0) {
    TestValidator.predicate(
      "total pages calculation should be correct",
      firstPage.pagination.pages ===
        Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    );
  } else {
    TestValidator.equals(
      "zero records should have zero pages",
      firstPage.pagination.pages,
      0,
    );
  }

  // Step 3: Test second page if available
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.communityPlatform.admin.members.index(connection, {
        body: {
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformMember.IRequest,
      });
    typia.assert(secondPage);

    TestValidator.equals(
      "second page should have correct page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "page limit should remain consistent",
      secondPage.pagination.limit,
      10,
    );
    TestValidator.equals(
      "total records should be consistent across pages",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "total pages should be consistent across pages",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );

    // Verify that data is different between pages if both have data
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "first member IDs should differ between pages",
        firstPage.data[0].id,
        secondPage.data[0].id,
      );
    }
  }

  // Step 4: Test maximum page limit constraint
  const maxLimitPage =
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: {
        page: 1,
        limit: 100, // Maximum allowed limit
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(maxLimitPage);

  TestValidator.equals(
    "maximum limit should be respected",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "data length should not exceed maximum limit",
    maxLimitPage.data.length <= 100,
  );

  // Step 5: Test page beyond available range
  const outOfRangePageNumber =
    firstPage.pagination.pages > 0 ? firstPage.pagination.pages + 10 : 10;
  const outOfRangePage =
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: {
        page: outOfRangePageNumber,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(outOfRangePage);

  // Should return empty data for pages beyond range
  TestValidator.equals(
    "out-of-range page should return empty data",
    outOfRangePage.data.length,
    0,
  );
  TestValidator.equals(
    "current page should be the requested page even if out of range",
    outOfRangePage.pagination.current,
    outOfRangePageNumber,
  );

  // Step 6: Test different limit values
  const smallLimitPage =
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  typia.assert(smallLimitPage);

  TestValidator.equals(
    "small limit should be respected",
    smallLimitPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length should not exceed small limit",
    smallLimitPage.data.length <= 5,
  );

  // Step 7: Test invalid pagination parameters
  await TestValidator.error("negative page number should fail", async () => {
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: {
        page: -1,
        limit: 10,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  });

  await TestValidator.error("zero limit should fail", async () => {
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: {
        page: 1,
        limit: 0,
      } satisfies ICommunityPlatformMember.IRequest,
    });
  });

  await TestValidator.error("limit exceeding maximum should fail", async () => {
    await api.functional.communityPlatform.admin.members.index(connection, {
      body: {
        page: 1,
        limit: 101, // Exceeds maximum limit of 100
      } satisfies ICommunityPlatformMember.IRequest,
    });
  });
}
