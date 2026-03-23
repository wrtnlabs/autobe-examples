import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can retrieve a paginated list of activity log entries.
 * This test validates the activity log listing functionality with pagination support,
 * ensuring proper response structure, pagination metadata, and data integrity.
 */
export async function test_api_activity_logs_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Test: Retrieve activity logs with default pagination
  const defaultResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {} satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // 3. Validate: Pagination metadata consistency
  TestValidator.predicate(
    "pagination current is positive",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is consistent",
    defaultResponse.pagination.pages ===
      Math.ceil(
        defaultResponse.pagination.records / defaultResponse.pagination.limit,
      ),
  );
  // 4. Test: Retrieve activity logs with custom pagination parameters
  const customPageResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          page: 2,
          page_size: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(customPageResponse);
  // 5. Validate: Custom pagination parameters are respected
  TestValidator.equals(
    "custom page number is respected",
    customPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom page_size is respected",
    customPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom pagination has valid structure",
    customPageResponse.pagination.current >= 1 &&
      customPageResponse.pagination.limit > 0 &&
      customPageResponse.pagination.records >= 0,
  );
  // 6. Test: Filter by action_type
  const filteredResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          action_type: "employee_hired",
          page: 1,
          page_size: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 7. Validate: Filter results contain only specified action_type
  for (const log of filteredResponse.data) {
    TestValidator.equals(
      `filtered log has correct action_type: ${log.id}`,
      log.action_type,
      "employee_hired",
    );
  }
  // 8. Test: Filter by date range
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const toDate = new Date();
  const dateRangeResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          from_date: fromDate.toISOString(),
          to_date: toDate.toISOString(),
          page: 1,
          page_size: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 9. Validate: Date range filter results are within specified range
  for (const log of dateRangeResponse.data) {
    const logDate = new Date(log.created_at);
    TestValidator.predicate(
      `log date is >= from_date: ${log.id}`,
      logDate >= fromDate,
    );
    TestValidator.predicate(
      `log date is <= to_date: ${log.id}`,
      logDate <= toDate,
    );
  }
  // 10. Test: Search functionality
  const searchResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          search: "employee",
          page: 1,
          page_size: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 11. Validate: Search results contain search term in action_description
  for (const log of searchResponse.data) {
    TestValidator.predicate(
      `search result contains term: ${log.id}`,
      log.action_description.toLowerCase().includes("employee"),
    );
  }
  // 12. Test: Sort order validation
  const sortedResponse =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
          page: 1,
          page_size: 10,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // 13. Validate: Ascending sort order
  for (let i = 1; i < sortedResponse.data.length; i++) {
    const prevDate = new Date(sortedResponse.data[i - 1].created_at);
    const currDate = new Date(sortedResponse.data[i].created_at);
    TestValidator.predicate(
      `ascending sort order at index ${i}`,
      prevDate <= currDate,
    );
  }
}
