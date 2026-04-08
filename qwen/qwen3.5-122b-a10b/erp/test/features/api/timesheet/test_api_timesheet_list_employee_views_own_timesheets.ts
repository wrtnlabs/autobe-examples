import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

export async function test_api_timesheet_list_employee_views_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Generate organization and employee IDs for testing
  // Note: In a full E2E test, these would be created via their respective endpoints
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create timesheets for different weeks
  const pastWeek1 = new Date();
  pastWeek1.setDate(pastWeek1.getDate() - 14);
  pastWeek1.setHours(0, 0, 0, 0);
  const pastWeek2 = new Date();
  pastWeek2.setDate(pastWeek2.getDate() - 7);
  pastWeek2.setHours(0, 0, 0, 0);
  const currentWeek = new Date();
  currentWeek.setHours(0, 0, 0, 0);
  // Create multiple timesheets for the employee
  const timesheet1 =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: pastWeek1.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(timesheet1);
  const timesheet2 =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: pastWeek2.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(timesheet2);
  const timesheet3 =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: currentWeek.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(timesheet3);
  // 3. List timesheets with employee filter - verify employee's timesheets returned
  const allTimesheets =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          employee_id: employeeId,
          page: 1,
          limit: 10,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(allTimesheets);
  TestValidator.equals("timesheets count", allTimesheets.data.length, 3);
  TestValidator.predicate(
    "has pagination metadata",
    allTimesheets.pagination.records >= 3,
  );
  // 4. List timesheets filtered by status (draft)
  const draftTimesheets =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          status: "draft",
          employee_id: employeeId,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(draftTimesheets);
  TestValidator.predicate(
    "all have draft status",
    draftTimesheets.data.every((ts) => ts.status === "draft"),
  );
  // 5. List timesheets filtered by date range
  const dateRangeStart = new Date(pastWeek1);
  const dateRangeEnd = new Date(pastWeek2);
  dateRangeEnd.setDate(dateRangeEnd.getDate() + 7);
  const dateRangeTimesheets =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          week_start_date_gte: dateRangeStart.toISOString(),
          week_start_date_lte: dateRangeEnd.toISOString(),
          employee_id: employeeId,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(dateRangeTimesheets);
  TestValidator.predicate(
    "all within date range",
    dateRangeTimesheets.data.every((ts) => {
      const tsDate = new Date(ts.week_start_date);
      return tsDate >= dateRangeStart && tsDate <= dateRangeEnd;
    }),
  );
  // 6. Test pagination with limit
  const paginatedTimesheets =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationid(
      memberConnection,
      {
        organizationId,
        body: {
          employee_id: employeeId,
          page: 1,
          limit: 2,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(paginatedTimesheets);
  TestValidator.equals(
    "pagination limit applied",
    paginatedTimesheets.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedTimesheets.pagination.current === 1,
  );
  TestValidator.predicate(
    "page has correct number of items",
    paginatedTimesheets.data.length <= 2,
  );
  TestValidator.predicate(
    "total records tracked",
    paginatedTimesheets.pagination.records >= 2,
  );
}
