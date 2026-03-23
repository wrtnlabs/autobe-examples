import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test activity log search functionality with description and member filtering.
 *
 * This test validates:
 * 1. Partial text matching on action_description using trigram index
 * 2. Filtering by specific acting member (member_id)
 * 3. Filtering by target entity type
 * 4. Proper sorting by created_at descending
 * 5. Combined filter functionality
 * 6. Empty results handling
 * 7. Acting member information is properly joined
 */
export async function test_api_activity_logs_search_by_description_and_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // Extract admin member ID for filtering tests
  const adminMemberId: string & tags.Format<"uuid"> = adminAuth.id;
  // 2. Test search with 'project' keyword
  const searchProjectRequest = {
    search: "project",
    member_id: adminMemberId,
    target_entity_type: "project",
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    page_size: 20,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const projectSearchResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: searchProjectRequest },
    );
  typia.assert(projectSearchResult);
  // Validate all returned entries match search criteria
  for (const log of projectSearchResult.data) {
    // Verify action_description contains 'project' (case-insensitive)
    TestValidator.predicate(
      `action_description contains 'project'`,
      log.action_description.toLowerCase().includes("project"),
    );
    // Verify acting member matches specified member_id
    if (log.actingMember !== null) {
      TestValidator.equals(
        "acting member id matches filter",
        log.actingMember.id,
        adminMemberId,
      );
    }
    // Verify target entity type is 'project'
    TestValidator.equals(
      "target entity type is project",
      log.target_entity_type,
      "project",
    );
  }
  // 3. Test with different search term 'employee'
  const searchEmployeeRequest = {
    search: "employee",
    member_id: adminMemberId,
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    page_size: 20,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const employeeSearchResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: searchEmployeeRequest },
    );
  typia.assert(employeeSearchResult);
  // Validate employee search results
  for (const log of employeeSearchResult.data) {
    TestValidator.predicate(
      `action_description contains 'employee'`,
      log.action_description.toLowerCase().includes("employee"),
    );
    if (log.actingMember !== null) {
      TestValidator.equals(
        "acting member id matches",
        log.actingMember.id,
        adminMemberId,
      );
    }
  }
  // 4. Test with non-existent search term (should return empty results)
  const searchNonExistentRequest = {
    search: "xyz_non_existent_term_12345",
    member_id: adminMemberId,
    page: 1,
    page_size: 20,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const nonExistentResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: searchNonExistentRequest },
    );
  typia.assert(nonExistentResult);
  // Verify empty results when no matches
  TestValidator.equals(
    "no results for non-existent search term",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0",
    nonExistentResult.pagination.records,
    0,
  );
  // 5. Test combined filters with different entity type
  const combinedFilterRequest = {
    search: "timesheet",
    target_entity_type: "timesheet",
    sort_by: "created_at",
    sort_order: "asc",
    page: 1,
    page_size: 10,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const combinedResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedResult);
  // Validate combined filter results
  for (const log of combinedResult.data) {
    TestValidator.predicate(
      `action_description contains 'timesheet'`,
      log.action_description.toLowerCase().includes("timesheet"),
    );
    TestValidator.equals(
      "target entity type is timesheet",
      log.target_entity_type,
      "timesheet",
    );
  }
  // 6. Test sorting order (descending)
  const sortTestRequest = {
    search: "task",
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    page_size: 50,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const sortTestResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: sortTestRequest },
    );
  typia.assert(sortTestResult);
  // Verify descending sort order (if multiple results exist)
  if (sortTestResult.data.length > 1) {
    for (let i = 1; i < sortTestResult.data.length; i++) {
      const prevDate = new Date(
        sortTestResult.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(sortTestResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `results are sorted in descending order by created_at`,
        prevDate >= currDate,
      );
    }
  }
  // 7. Test pagination
  const paginationRequest = {
    search: "project",
    page: 1,
    page_size: 5,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const paginationResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);
  // Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "page size matches request",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length does not exceed page size",
    paginationResult.data.length <= 5,
  );
  // 8. Test with action_type filter
  const actionTypeFilterRequest = {
    action_type: "employee_hired",
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    page_size: 20,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const actionTypeResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: actionTypeFilterRequest },
    );
  typia.assert(actionTypeResult);
  // Validate action_type filter
  for (const log of actionTypeResult.data) {
    TestValidator.equals(
      "action type matches filter",
      log.action_type,
      "employee_hired",
    );
  }
  // 9. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    from_date: oneWeekAgo.toISOString(),
    to_date: now.toISOString(),
    sort_by: "created_at",
    sort_order: "desc",
    page: 1,
    page_size: 20,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const dateRangeResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResult);
  // Validate date range filter
  for (const log of dateRangeResult.data) {
    const logDate = new Date(log.created_at).getTime();
    TestValidator.predicate(
      `log created_at is within date range`,
      logDate >= oneWeekAgo.getTime() && logDate <= now.getTime(),
    );
  }
  // 10. Test acting member information is properly joined
  const memberInfoRequest = {
    member_id: adminMemberId,
    page: 1,
    page_size: 10,
  } satisfies IHrmPlatformActivityLog.IRequest;
  const memberInfoResult =
    await api.functional.hrmPlatform.admin.activity_logs.index(
      adminConnection,
      { body: memberInfoRequest },
    );
  typia.assert(memberInfoResult);
  // Verify acting member information exists and is correct
  for (const log of memberInfoResult.data) {
    if (log.actingMember !== null) {
      TestValidator.equals(
        "acting member id matches filter",
        log.actingMember.id,
        adminMemberId,
      );
      TestValidator.predicate(
        "acting member email is valid",
        typia.is<string & tags.Format<"email">>(log.actingMember.email),
      );
      TestValidator.predicate(
        "acting member created_at is valid",
        typia.is<string & tags.Format<"date-time">>(
          log.actingMember.created_at,
        ),
      );
    }
  }
}
