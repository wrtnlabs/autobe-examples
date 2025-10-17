import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePlatformSuspension";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePlatformSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePlatformSuspension";

/**
 * Test pagination functionality when searching platform suspensions.
 *
 * This test validates that the platform suspension search API correctly
 * implements pagination, allowing administrators to efficiently browse through
 * large suspension lists. The test creates a substantial dataset of suspensions
 * and verifies pagination accuracy, data consistency, and edge case handling.
 *
 * Test workflow:
 *
 * 1. Create administrator account for suspension management
 * 2. Create multiple member accounts to generate test data
 * 3. Issue various suspensions (permanent and temporary)
 * 4. Test pagination with different page sizes
 * 5. Validate pagination metadata accuracy
 * 6. Verify data consistency and no duplicates across pages
 * 7. Test edge cases (first page, last page, beyond available)
 */
export async function test_api_platform_suspension_search_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create multiple member accounts (30 members for substantial dataset)
  const memberCount = 30;
  const members = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        username: `testuser_${index}_${RandomGenerator.alphaNumeric(6)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 3: Issue suspensions to most members (suspend 25 out of 30)
  const suspensionReasons = [
    "spam",
    "harassment",
    "hate_speech",
    "illegal_content",
    "ban_evasion",
  ] as const;
  const suspendCount = 25;
  const createdSuspensions: IRedditLikePlatformSuspension[] = [];

  for (let i = 0; i < suspendCount; i++) {
    const member = members[i];
    const isPermanent = i % 3 === 0; // Every 3rd suspension is permanent

    const suspension =
      await api.functional.redditLike.admin.platform.suspensions.create(
        connection,
        {
          body: {
            suspended_member_id: member.id,
            suspension_reason_category: RandomGenerator.pick(suspensionReasons),
            suspension_reason_text: RandomGenerator.paragraph({ sentences: 5 }),
            internal_notes: RandomGenerator.paragraph({ sentences: 3 }),
            is_permanent: isPermanent,
            expiration_date: isPermanent
              ? undefined
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          } satisfies IRedditLikePlatformSuspension.ICreate,
        },
      );
    typia.assert(suspension);
    createdSuspensions.push(suspension);
  }

  // Step 4: Test pagination with page size 10
  const pageSize = 10;
  const firstPage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 5: Validate pagination metadata for first page
  TestValidator.equals(
    "total records matches created suspensions",
    firstPage.pagination.records,
    suspendCount,
  );
  TestValidator.equals(
    "total pages calculated correctly",
    firstPage.pagination.pages,
    Math.ceil(suspendCount / pageSize),
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.equals(
    "limit matches requested page size",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "first page data length matches page size",
    firstPage.data.length,
    pageSize,
  );

  // Step 6: Fetch second page
  const secondPage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: pageSize,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(secondPage);

  // Step 7: Validate second page metadata
  TestValidator.equals(
    "second page total records consistent",
    secondPage.pagination.records,
    suspendCount,
  );
  TestValidator.equals(
    "second page current page is 2",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page data length matches page size",
    secondPage.data.length,
    pageSize,
  );

  // Step 8: Verify no duplicates between pages
  const firstPageIds = firstPage.data.map((s) => s.id);
  const secondPageIds = secondPage.data.map((s) => s.id);
  const duplicates = firstPageIds.filter((id) => secondPageIds.includes(id));
  TestValidator.equals(
    "no duplicates between first and second page",
    duplicates.length,
    0,
  );

  // Step 9: Fetch third page (last page with partial results)
  const thirdPage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 3,
          limit: pageSize,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(thirdPage);

  // Step 10: Validate last page has remaining items
  const expectedLastPageSize = suspendCount - 2 * pageSize;
  TestValidator.equals(
    "last page has remaining items",
    thirdPage.data.length,
    expectedLastPageSize,
  );
  TestValidator.equals(
    "last page current is 3",
    thirdPage.pagination.current,
    3,
  );

  // Step 11: Test with different page size (5 items per page)
  const smallPageSize = 5;
  const smallPage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: smallPageSize,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(smallPage);

  TestValidator.equals(
    "small page size data length",
    smallPage.data.length,
    smallPageSize,
  );
  TestValidator.equals(
    "small page size total pages",
    smallPage.pagination.pages,
    Math.ceil(suspendCount / smallPageSize),
  );
  TestValidator.equals(
    "small page size limit",
    smallPage.pagination.limit,
    smallPageSize,
  );

  // Step 12: Test with large page size (20 items per page)
  const largePageSize = 20;
  const largePage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: largePageSize,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(largePage);

  TestValidator.equals(
    "large page size data length",
    largePage.data.length,
    largePageSize,
  );
  TestValidator.equals(
    "large page size total pages",
    largePage.pagination.pages,
    Math.ceil(suspendCount / largePageSize),
  );

  // Step 13: Collect all suspensions across all pages to verify completeness
  const allSuspensions: IRedditLikePlatformSuspension[] = [];
  const totalPages = firstPage.pagination.pages;

  for (let page = 1; page <= totalPages; page++) {
    const pageResult =
      await api.functional.redditLike.admin.platform.suspensions.index(
        connection,
        {
          body: {
            page: page,
            limit: pageSize,
          } satisfies IRedditLikePlatformSuspension.IRequest,
        },
      );
    typia.assert(pageResult);
    allSuspensions.push(...pageResult.data);
  }

  // Step 14: Verify total collected suspensions match created count
  TestValidator.equals(
    "all suspensions collected from pagination",
    allSuspensions.length,
    suspendCount,
  );

  // Step 15: Verify all suspension IDs are unique (no duplicates across all pages)
  const allIds = allSuspensions.map((s) => s.id);
  const uniqueIds = [...new Set(allIds)];
  TestValidator.equals(
    "all suspension IDs are unique",
    uniqueIds.length,
    suspendCount,
  );

  // Step 16: Test filtering with pagination (active suspensions only)
  const activeFilterPage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_active: true,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(activeFilterPage);

  // All created suspensions should be active
  TestValidator.equals(
    "active filter returns all suspensions",
    activeFilterPage.pagination.records,
    suspendCount,
  );

  // Step 17: Test filtering with pagination (permanent suspensions only)
  const permanentFilterPage =
    await api.functional.redditLike.admin.platform.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          is_permanent: true,
        } satisfies IRedditLikePlatformSuspension.IRequest,
      },
    );
  typia.assert(permanentFilterPage);

  // Calculate expected permanent count (indices 0, 3, 6, 9, 12, 15, 18, 21, 24)
  const expectedPermanentCount = Math.ceil(suspendCount / 3);
  TestValidator.equals(
    "permanent filter returns correct count",
    permanentFilterPage.pagination.records,
    expectedPermanentCount,
  );
}
