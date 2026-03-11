import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test date range filtering capabilities for administrative history records.
 * Validate that the system correctly filters records within specified start_date
 * and end_date parameters, including boundary conditions and overlapping date ranges.
 * Test edge cases such as future dates and empty date ranges.
 * Verify that pagination works correctly with date-filtered results and that
 * chronological ordering is maintained.
 */
export async function test_api_admin_administrative_histories_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Get current timestamp for reference
  const now = new Date();
  // 3. Test basic date range search with wide range to get existing records
  const wideRangeSearch: IDiscussionBoardAdministrativeHistory.IRequest = {
    start_date: new Date(
      now.getTime() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 1 year ago
    end_date: now.toISOString(),
    limit: 10,
    page: 1,
  };
  const wideRangeResult =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      { body: wideRangeSearch },
    );
  typia.assert(wideRangeResult);
  // 4. Test chronological ordering of results
  if (wideRangeResult.data.length > 1) {
    for (let i = 1; i < wideRangeResult.data.length; i++) {
      const current = new Date(wideRangeResult.data[i].created_at);
      const previous = new Date(wideRangeResult.data[i - 1].created_at);
      TestValidator.predicate(
        `records should be ordered chronologically (descending) at position ${i}`,
        current <= previous,
      );
    }
  }
  // 5. Test narrower date range if we have records
  if (wideRangeResult.data.length > 0) {
    const firstRecord = wideRangeResult.data[0];
    const lastRecord = wideRangeResult.data[wideRangeResult.data.length - 1];
    const narrowRangeSearch: IDiscussionBoardAdministrativeHistory.IRequest = {
      start_date: lastRecord.created_at,
      end_date: firstRecord.created_at,
      limit: 100,
      page: 1,
    };
    const narrowRangeResult =
      await api.functional.discussionBoard.admin.administrative_histories.index(
        adminConnection,
        { body: narrowRangeSearch },
      );
    typia.assert(narrowRangeResult);
    // Verify all returned records are within the specified range
    narrowRangeResult.data.forEach((record, index) => {
      const recordDate = new Date(record.created_at);
      const startDate = new Date(narrowRangeSearch.start_date!);
      const endDate = new Date(narrowRangeSearch.end_date!);
      TestValidator.predicate(
        `record ${index} should be within narrow date range`,
        recordDate >= startDate && recordDate <= endDate,
      );
    });
  }
  // 6. Test empty date range (future dates - no records should match)
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  const emptyRangeSearch: IDiscussionBoardAdministrativeHistory.IRequest = {
    start_date: futureDate.toISOString(),
    end_date: new Date(
      futureDate.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(), // Next day
    limit: 10,
    page: 1,
  };
  const emptyRangeResult =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      { body: emptyRangeSearch },
    );
  typia.assert(emptyRangeResult);
  TestValidator.equals(
    "future date range should return empty results",
    emptyRangeResult.data.length,
    0,
  );
  // 7. Test pagination with date filtering
  const paginatedSearch: IDiscussionBoardAdministrativeHistory.IRequest = {
    start_date: new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 30 days ago
    end_date: now.toISOString(),
    limit: 2,
    page: 1,
  };
  const page1Result =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      { body: paginatedSearch },
    );
  typia.assert(page1Result);
  if (page1Result.pagination.records > 0) {
    TestValidator.equals(
      "page 1 should return at most limit number of records",
      page1Result.data.length,
      Math.min(2, page1Result.pagination.records),
    );
    // Test second page if there are more records
    if (page1Result.pagination.pages > 1) {
      paginatedSearch.page = 2;
      const page2Result =
        await api.functional.discussionBoard.admin.administrative_histories.index(
          adminConnection,
          { body: paginatedSearch },
        );
      typia.assert(page2Result);
      TestValidator.predicate(
        "page 2 should have records",
        page2Result.data.length > 0,
      );
      // Verify records are different from page 1
      if (page1Result.data.length > 0 && page2Result.data.length > 0) {
        TestValidator.notEquals(
          "page 2 should return different records than page 1",
          page1Result.data[0]?.id,
          page2Result.data[0]?.id,
        );
      }
    }
  }
  // 8. Test combination with search filter
  const combinedSearch: IDiscussionBoardAdministrativeHistory.IRequest = {
    start_date: new Date(
      now.getTime() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    end_date: now.toISOString(),
    search: "", // Empty search to test combination
    limit: 10,
    page: 1,
  };
  const combinedResult =
    await api.functional.discussionBoard.admin.administrative_histories.index(
      adminConnection,
      { body: combinedSearch },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined search with date range should complete successfully",
    combinedResult.pagination.records >= 0,
  );
}
