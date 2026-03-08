import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardBanRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economic_political_board_admin_ban_records_create } from "../../../generate/generate_random_economic_political_board_admin_ban_records_create";
import { prepare_random_economic_political_board_ban_record } from "../../../prepare/prepare_random_economic_political_board_ban_record";

/**
 * Test ban records filtering, sorting, and pagination capabilities.
 *
 * Tests the PATCH /economicPoliticalBoard/admin/ban-records endpoint with:
 * - Date range filtering (dateFrom, dateTo)
 * - Reason keyword search (reasonKeywords)
 * - Sorting by different fields (sortBy, sortOrder)
 * - Pagination controls (page, pageSize, limit)
 */
export async function test_api_ban_records_filtering_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@test.com",
      password: "admin123456",
      href: "http://localhost/admin",
      referrer: "http://localhost",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  adminConnection.headers!.Authorization = adminAuth.token.access;
  // 2. Create test ban records with different dates and reasons
  // We need to create users first to ban, but the ICreate requires user_id
  // We'll create users through the admin role system
  // Create 3 users to ban with different timestamps
  const testUsers = ArrayUtil.repeat(3, (index) => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    banned_at: new Date(Date.now() + index * 3600000), // Different timestamps (hour apart)
    reason:
      index % 2 === 0 ? "Spam and harassment" : "Policy violation detected",
  }));
  // Store ban records created
  const banRecords: IEconomicPoliticalBoardBanRecord[] = [];
  // Create ban records using the generate utility
  for (let i = 0; i < 3; i++) {
    const userToBan = testUsers[i];
    const banRecord =
      await generate_random_economic_political_board_admin_ban_records_create(
        adminConnection,
        {
          body: {
            user_id: userToBan.user_id,
            reason: userToBan.reason,
          } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
        },
      );
    typia.assert(banRecord);
    banRecords.push(banRecord);
  }
  // 3. Test filtering and sorting scenarios
  // 3.1 - Date Range Filtering
  const { dateFrom, dateTo } = banRecords.reduce(
    (acc, record) => {
      const createdAt = new Date(record.created_at);
      if (!acc.dateFrom || createdAt < acc.dateFrom) {
        acc.dateFrom = createdAt;
      }
      if (!acc.dateTo || createdAt > acc.dateTo) {
        acc.dateTo = createdAt;
      }
      return acc;
    },
    { dateFrom: new Date(), dateTo: new Date() },
  );
  const midPoint = new Date(
    dateFrom.getTime() + (dateTo.getTime() - dateFrom.getTime()) / 2,
  );
  const dateFilteredResponse =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          dateFrom: dateFrom.toISOString(),
          dateTo: midPoint.toISOString(),
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(dateFilteredResponse);
  // Verify all returned records fall within the date range
  for (const record of dateFilteredResponse.data) {
    TestValidator.predicate(
      "record created_at within dateFrom",
      new Date(record.created_at) >= dateFrom,
    );
    TestValidator.predicate(
      "record created_at within dateTo",
      new Date(record.created_at) <= midPoint,
    );
  }
  // 3.2 - Reason Keyword Search
  const spamKeywords = "spam";
  const keywordFilteredResponse =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          reasonKeywords: spamKeywords,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(keywordFilteredResponse);
  // Verify all returned records contain the keyword (case-insensitive)
  for (const record of keywordFilteredResponse.data) {
    TestValidator.predicate(
      "reason contains search keywords (case-insensitive)",
      record.reason.toLowerCase().includes(spamKeywords.toLowerCase()),
    );
  }
  // 3.3 - Sorting by Different Fields
  // Sort by user_id ascending
  const sortByUserIdAsc =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          sortBy: "user_id",
          sortOrder: "asc",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(sortByUserIdAsc);
  // Verify records are sorted by user_id ascending
  for (let i = 1; i < sortByUserIdAsc.data.length; i++) {
    TestValidator.predicate(
      "user_id ascending order",
      sortByUserIdAsc.data[i - 1].user_id <= sortByUserIdAsc.data[i].user_id,
    );
  }
  // Sort by created_at descending
  const sortByCreatedDesc =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(sortByCreatedDesc);
  // Verify records are sorted by created_at descending
  for (let i = 1; i < sortByCreatedDesc.data.length; i++) {
    TestValidator.predicate(
      "created_at descending order",
      new Date(sortByCreatedDesc.data[i - 1].created_at) >=
        new Date(sortByCreatedDesc.data[i].created_at),
    );
  }
  // Sort by banned_by_admin_id ascending
  const sortByBannedByAdminAsc =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          sortBy: "banned_by_admin_id",
          sortOrder: "asc",
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(sortByBannedByAdminAsc);
  // Verify records are sorted by banned_by_admin_id ascending
  for (let i = 1; i < sortByBannedByAdminAsc.data.length; i++) {
    TestValidator.predicate(
      "banned_by_admin_id ascending order",
      sortByBannedByAdminAsc.data[i - 1].banned_by_admin_id <=
        sortByBannedByAdminAsc.data[i].banned_by_admin_id,
    );
  }
  // 3.4 - Pagination Controls
  // Test with pageSize=2
  const pageSizeTwo =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          pageSize: 2,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(pageSizeTwo);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination limit is 2",
    pageSizeTwo.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pageSizeTwo.pagination.current,
    1,
  );
  TestValidator.predicate(
    "data contains at most 2 records",
    pageSizeTwo.data.length <= 2,
  );
  // Test pagination with page=1
  const pageOne =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          page: 1,
          pageSize: 2,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(pageOne);
  // Test pagination with page=2
  const pageTwo =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          page: 2,
          pageSize: 2,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(pageTwo);
  // Verify we get second page
  TestValidator.equals(
    "pagination current page is 2",
    pageTwo.pagination.current,
    2,
  );
  TestValidator.notEquals(
    "page 1 and page 2 contain different records",
    pageOne.data,
    pageTwo.data,
  );
  // Test combined filtering and sorting with pagination
  const combined =
    await api.functional.economicPoliticalBoard.admin.ban_records.index(
      adminConnection,
      {
        body: {
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          reasonKeywords: "spam",
          sortBy: "created_at",
          sortOrder: "asc",
          pageSize: 2,
          page: 1,
        } satisfies IEconomicPoliticalBoardBanRecord.IRequest,
      },
    );
  typia.assert(combined);
  // Verify pagination metadata matches filtered and sorted results
  TestValidator.predicate(
    "pagination pages matches total records and limit",
    combined.pagination.pages ===
      Math.ceil(combined.pagination.records / combined.pagination.limit),
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    combined.pagination.records >= combined.data.length,
  );
}