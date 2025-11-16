import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Test pagination controls for audit log retrieval including page number and
 * limit parameters.
 *
 * Validates that page=1 returns the first page of results, page=2 returns the
 * second page, etc. Tests that limit parameter controls records per page with
 * minimum of 1 and maximum of 100 records. Verifies that default pagination
 * (page=1, limit=20) returns the first 20 records when not specified. Confirms
 * that pagination metadata returned includes current page, limit, total
 * records, and total pages. Tests navigation through multiple pages of large
 * audit log datasets. Validates that pagination correctly calculates total
 * pages as ceiling of (records / limit).
 */
export async function test_api_moderation_audit_logs_pagination_control(
  connection: api.IConnection,
) {
  // Setup: Create moderator account for accessing audit logs
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(12),
        href: "https://community.example.com/auth/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Test 1: Default pagination (page=1, limit=20)
  const defaultPage =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {} satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default pagination should have pagination metadata",
    defaultPage.pagination.records >= 0 && defaultPage.pagination.pages >= 0,
  );

  // Test 2: Explicit page=1 with default limit
  const page1 =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 should return page 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20 by default",
    page1.pagination.limit,
    20,
  );

  // Test 3: Test limit parameter with various values
  const limitValues = [1, 10, 20, 50, 100] as const;
  for (const limit of limitValues) {
    const result =
      await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
        connection,
        {
          body: {
            limit,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals(
      `limit should be ${limit}`,
      result.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `data array should have at most ${limit} items`,
      result.data.length <= limit,
    );
  }

  // Test 4: Pagination metadata validation
  const metadataTest =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(metadataTest);
  TestValidator.predicate(
    "current page should be positive",
    metadataTest.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit should be positive",
    metadataTest.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    metadataTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    metadataTest.pagination.pages >= 0,
  );

  // Test 5: Validate page calculation (pages = ceiling(records / limit))
  const pageCalcTest =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          limit: 10,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(pageCalcTest);
  const expectedPages = Math.ceil(
    pageCalcTest.pagination.records / pageCalcTest.pagination.limit,
  );
  TestValidator.equals(
    "total pages should equal ceiling(records / limit)",
    pageCalcTest.pagination.pages,
    expectedPages,
  );

  // Test 6: Navigate through pages
  if (pageCalcTest.pagination.pages > 1) {
    const page2 =
      await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
        connection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 should have current=2",
      page2.pagination.current,
      2,
    );

    // Verify page 1 and page 2 have different data (if page 2 is available)
    if (pageCalcTest.data.length > 0 && page2.data.length > 0) {
      const page1Ids = pageCalcTest.data.map((item) => item.id);
      const page2Ids = page2.data.map((item) => item.id);
      const hasDistinctData = !page1Ids.some((id) => page2Ids.includes(id));
      TestValidator.predicate(
        "page 1 and page 2 should contain distinct records",
        hasDistinctData || page1Ids.length === 0 || page2Ids.length === 0,
      );
    }
  }

  // Test 7: Edge case - limit of 1
  const limitOne =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          limit: 1,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(limitOne);
  TestValidator.equals(
    "limit 1 should be respected",
    limitOne.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "with limit 1, data should have at most 1 item",
    limitOne.data.length <= 1,
  );

  // Test 8: Edge case - limit of 100 (maximum)
  const limitMax =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(limitMax);
  TestValidator.equals(
    "limit 100 should be respected",
    limitMax.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "with limit 100, data should have at most 100 items",
    limitMax.data.length <= 100,
  );

  // Test 9: Consistency check - same page with same limit should return same results
  const consistencyTest1 =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(consistencyTest1);

  const consistencyTest2 =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 15,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(consistencyTest2);

  TestValidator.equals(
    "repeated requests should return same pagination metadata",
    consistencyTest1.pagination,
    consistencyTest2.pagination,
  );
}
