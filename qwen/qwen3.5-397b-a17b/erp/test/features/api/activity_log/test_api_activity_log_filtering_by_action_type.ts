import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test filtering activity logs by specific action types to validate business logic filtering.
 *
 * Validates the activity log filtering functionality by querying logs with different actionType filters. Tests that the API correctly returns only entries matching the specified action type and that pagination metadata is accurate. Ensures the audit trail can categorize and filter events by action category.
 *
 * Special attention is given to verifying that actionType values follow the documented format (e.g., employee:invite, contract:create, timesheet:submit, timesheet:approve, task:status-change, project:create, role:assign) and that filtering works correctly across multiple different action types.
 *
 * 1. Member registers with email and password using authorize_member_join utility.
 * 2. Create member-specific connection with authentication token.
 * 3. Query activity logs with actionType filter 'employee:invite'.
 * 4. Validate response structure includes pagination and data array.
 * 5. Query activity logs with different actionType 'project:create'.
 * 6. Validate response structure and ensure filtering is working.
 * 7. Query activity logs with actionType 'timesheet:approve'.
 * 8. Validate pagination metadata is correct (current page, limit, records, pages).
 * 9. Test with date range filters combined with actionType.
 * 10. Verify all returned entries have actionType matching the filter.
 */
export async function test_api_activity_log_filtering_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Query activity logs with actionType 'employee:invite'
  const employeeInviteLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          actionType: "employee:invite",
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(employeeInviteLogs);
  // 3. Validate response structure
  TestValidator.predicate(
    "has pagination",
    employeeInviteLogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(employeeInviteLogs.data),
  );
  TestValidator.equals(
    "pagination current",
    employeeInviteLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    employeeInviteLogs.pagination.limit,
    20,
  );
  // 4. Query activity logs with actionType 'project:create'
  const projectCreateLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          actionType: "project:create",
          page: 1,
          limit: 15,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(projectCreateLogs);
  // 5. Validate pagination for second query
  TestValidator.equals(
    "pagination current",
    projectCreateLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    projectCreateLogs.pagination.limit,
    15,
  );
  // 6. Query activity logs with actionType 'timesheet:approve'
  const timesheetApproveLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          actionType: "timesheet:approve",
          page: 1,
          limit: 25,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(timesheetApproveLogs);
  // 7. Validate pagination for third query
  TestValidator.equals(
    "pagination current",
    timesheetApproveLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    timesheetApproveLogs.pagination.limit,
    25,
  );
  // 8. Verify all returned entries have matching actionType
  for (const log of employeeInviteLogs.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      "employee:invite",
    );
  }
  for (const log of projectCreateLogs.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      "project:create",
    );
  }
  for (const log of timesheetApproveLogs.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      "timesheet:approve",
    );
  }
  // 9. Test with date range filter combined with actionType
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const dateTo = new Date();
  const datedLogs = await api.functional.hrmPlatform.member.activity_logs.index(
    memberConnection,
    {
      body: {
        actionType: "task:status-change",
        dateFrom: dateFrom.toISOString().split("T")[0],
        dateTo: dateTo.toISOString().split("T")[0],
        page: 1,
        limit: 10,
      } satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(datedLogs);
  // 10. Validate dated logs
  TestValidator.predicate("has pagination", datedLogs.pagination !== undefined);
  TestValidator.predicate("has data array", Array.isArray(datedLogs.data));
  for (const log of datedLogs.data) {
    TestValidator.equals(
      "actionType matches filter",
      log.actionType,
      "task:status-change",
    );
  }
  // 11. Test with search parameter
  const searchLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          search: "employee",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformActivityLog.IRequest,
      },
    );
  typia.assert(searchLogs);
  TestValidator.predicate(
    "has pagination",
    searchLogs.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(searchLogs.data));
}
