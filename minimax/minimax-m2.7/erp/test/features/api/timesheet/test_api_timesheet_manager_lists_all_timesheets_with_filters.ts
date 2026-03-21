import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_member_invitations_create } from "../../../generate/generate_random_erp_hrm_member_invitations_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_invitation } from "../../../prepare/prepare_random_erp_hrm_invitation";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_manager_lists_all_timesheets_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin member with time:approve permission
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://example.com/admin",
      referrer: "https://example.com",
    },
  });
  // Create a new connection with admin token
  const adminTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${adminAuth.token.access}`,
    },
  };
  // Step 2: Create a custom manager role with time:approve permission
  const managerRole = await generate_random_erp_hrm_admin_roles_create(
    adminTokenConnection,
    {
      body: {
        name: RandomGenerator.name(),
        permissions: ["time:approve", "time:view_all", "employee:manage"],
      },
    },
  );
  // Step 3: Create employee 1 via invitation
  const employee1Email = typia.random<string & tags.Format<"email">>();
  const employee1Invitation =
    await generate_random_erp_hrm_member_invitations_create(
      adminTokenConnection,
      {
        body: {
          email: employee1Email,
          position: "Developer",
          erpHrmRoleId: managerRole.id,
        },
      },
    );
  // Step 4: Create employee 2 via invitation
  const employee2Email = typia.random<string & tags.Format<"email">>();
  const employee2Invitation =
    await generate_random_erp_hrm_member_invitations_create(
      adminTokenConnection,
      {
        body: {
          email: employee2Email,
          position: "Designer",
          erpHrmRoleId: managerRole.id,
        },
      },
    );
  // Step 5: Create manager connection for timesheet operations
  // Use admin auth to get time:approve permission context
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(managerConnection, {
    body: {
      email: adminAuth.email,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // Step 6: Create timesheets with different weeks
  const timesheet1 = await generate_random_erp_hrm_member_timesheets_create(
    managerConnection,
    {
      body: {
        week_start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        week_end_date: new Date(
          Date.now() - 1 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    },
  );
  const timesheet2 = await generate_random_erp_hrm_member_timesheets_create(
    managerConnection,
    {
      body: {
        week_start_date: new Date(
          Date.now() - 14 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        week_end_date: new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    },
  );
  const timesheet3 = await generate_random_erp_hrm_member_timesheets_create(
    managerConnection,
    {
      body: {
        week_start_date: new Date(
          Date.now() - 21 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        week_end_date: new Date(
          Date.now() - 15 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    },
  );
  // Step 7: Validation 1 - Empty body returns ALL timesheets
  const allTimesheets = await api.functional.erpHrm.member.timesheets.index(
    managerConnection,
    {
      body: {},
    },
  );
  typia.assert(allTimesheets);
  TestValidator.equals(
    "should have data array",
    Array.isArray(allTimesheets.data),
    true,
  );
  TestValidator.predicate(
    "should return timesheets",
    allTimesheets.data.length > 0,
  );
  // Step 8: Validation 2 - Response includes employee summary
  const firstTimesheet = allTimesheets.data[0];
  TestValidator.equals(
    "should have employee summary",
    firstTimesheet.employee !== undefined,
    true,
  );
  TestValidator.equals(
    "should have employee id",
    firstTimesheet.employee.id !== undefined,
    true,
  );
  // Step 9: Validation 3 - Filter by status='draft'
  const draftTimesheets = await api.functional.erpHrm.member.timesheets.index(
    managerConnection,
    {
      body: {
        status: "draft",
      },
    },
  );
  typia.assert(draftTimesheets);
  for (const ts of draftTimesheets.data) {
    TestValidator.equals("status should be draft", ts.status, "draft");
  }
  // Step 10: Validation 4 - Filter by specific employeeId
  const employeeTimesheets =
    await api.functional.erpHrm.member.timesheets.index(managerConnection, {
      body: {
        employeeId: firstTimesheet.employee.id,
      },
    });
  typia.assert(employeeTimesheets);
  for (const ts of employeeTimesheets.data) {
    TestValidator.equals(
      "employee should match filter",
      ts.employee.id,
      firstTimesheet.employee.id,
    );
  }
  // Step 11: Validation 5 - Pagination with page and limit
  const paginatedTimesheets =
    await api.functional.erpHrm.member.timesheets.index(managerConnection, {
      body: {
        page: 1,
        limit: 2,
      },
    });
  typia.assert(paginatedTimesheets);
  TestValidator.equals(
    "pagination limit should be 2",
    paginatedTimesheets.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data count should not exceed limit",
    paginatedTimesheets.data.length <= 2,
  );
  // Step 12: Validation 6 - Sorting by week_start_date DESC
  const sortedTimesheets = await api.functional.erpHrm.member.timesheets.index(
    managerConnection,
    {
      body: {
        sort: "week_start_date",
        limit: 10,
      },
    },
  );
  typia.assert(sortedTimesheets);
  if (sortedTimesheets.data.length > 1) {
    for (let i = 0; i < sortedTimesheets.data.length - 1; i++) {
      const current = new Date(sortedTimesheets.data[i].weekStartDate);
      const next = new Date(sortedTimesheets.data[i + 1].weekStartDate);
      TestValidator.predicate(
        "week_start_date should be in descending order",
        current >= next,
      );
    }
  }
  // Step 13: Validation 7 - Date range filter (weekStartDateFrom)
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dateRangeTimesheets =
    await api.functional.erpHrm.member.timesheets.index(managerConnection, {
      body: {
        weekStartDateFrom: twoWeeksAgo.toISOString(),
      },
    });
  typia.assert(dateRangeTimesheets);
  for (const ts of dateRangeTimesheets.data) {
    const weekStart = new Date(ts.weekStartDate);
    TestValidator.predicate(
      "weekStartDate should be >= twoWeeksAgo",
      weekStart >= twoWeeksAgo,
    );
  }
}