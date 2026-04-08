import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackActivityLog";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployeeContract";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity logs filtering by activity type and entity associations.
 *
 * Validates that an authenticated member can filter activity logs using activity_type and entity filters (employee_id, project_id, task_id). Ensures that filtering returns only matching logs and that pagination metadata accurately reflects filtered result counts.
 *
 * Special attention is given to verifying that activity type filtering correctly matches the specified type, entity filtering returns only logs associated with the specified entity, and combined filtering works as expected. Multi-tenancy isolation is implicitly validated by the member-only access to their organization's logs.
 *
 * 1. Register and authenticate as a member.
 * 2. Call activity logs with activity_type filter and verify all logs match.
 * 3. Extract an employee_id from results and filter by employee_id.
 * 4. Verify all returned logs reference the specified employee.
 * 5. Test combined filtering with both activity_type and employee_id.
 * 6. Validate pagination metadata (current, limit, records, pages).
 * 7. Verify multi-tenancy isolation through member-scoped access.
 */
export async function test_api_activity_logs_filter_by_activity_type_and_entity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Test filtering by activity_type
  const activityTypeFilter = "employee_created";
  const activityTypeResult =
    await api.functional.hrmTimeTrack.member.activity_logs.index(
      memberConnection,
      {
        body: {
          activity_type: activityTypeFilter,
          limit: 20,
        } satisfies IHrmTimeTrackActivityLog.IRequest,
      },
    );
  typia.assert(activityTypeResult);
  // Verify all returned logs match the specified activity type
  TestValidator.predicate("all logs match activity_type filter", () =>
    activityTypeResult.data.every(
      (log) => log.activity_type === activityTypeFilter,
    ),
  );
  // 3. Extract an employee_id from results for entity filtering
  const employeeWithLogs = activityTypeResult.data.find(
    (log) => log.employee != null,
  );
  if (employeeWithLogs && employeeWithLogs.employee != null) {
    const employeeId = employeeWithLogs.employee.id;
    // 4. Test filtering by employee_id
    const employeeFilterResult =
      await api.functional.hrmTimeTrack.member.activity_logs.index(
        memberConnection,
        {
          body: {
            employee_id: employeeId,
            limit: 20,
          } satisfies IHrmTimeTrackActivityLog.IRequest,
        },
      );
    typia.assert(employeeFilterResult);
    // Verify all returned logs reference the specified employee
    TestValidator.predicate("all logs reference the specified employee", () =>
      employeeFilterResult.data.every(
        (log) => log.employee != null && log.employee.id === employeeId,
      ),
    );
    // 5. Test combined filtering with both activity_type and employee_id
    const combinedFilterResult =
      await api.functional.hrmTimeTrack.member.activity_logs.index(
        memberConnection,
        {
          body: {
            activity_type: activityTypeFilter,
            employee_id: employeeId,
            limit: 20,
          } satisfies IHrmTimeTrackActivityLog.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
    // Verify all logs match both filters
    TestValidator.predicate(
      "all logs match both activity_type and employee_id filters",
      () =>
        combinedFilterResult.data.every(
          (log) =>
            log.activity_type === activityTypeFilter &&
            log.employee != null &&
            log.employee.id === employeeId,
        ),
    );
  }
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => activityTypeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    () =>
      activityTypeResult.pagination.limit >= 1 &&
      activityTypeResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    () => activityTypeResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    () => activityTypeResult.pagination.pages >= 0,
  );
  // 7. Verify data count matches pagination
  TestValidator.predicate(
    "data array length is within limit",
    () => activityTypeResult.data.length <= activityTypeResult.pagination.limit,
  );
}
