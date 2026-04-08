import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_addition_to_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: create admin account, login, and get organization context
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
  // Admin is the organization owner, so they have org context - get organization ID
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  typia.assert(adminOrgContext);
  const organizationId = adminOrgContext.organization.id;
  // 2. Create project using admin connection
  const projectResult = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(projectResult);
  // Extract projectId from budget report items
  const projectId = projectResult.items[0]?.projectId;
  TestValidator.predicate(
    "project created with valid id",
    projectId !== undefined,
  );
  // 3. Member setup: authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.ILogin,
  });
  // 4. Set organization context for member (creates employee record in org)
  const memberOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {
        body: {
          organizationId: organizationId,
        },
      },
    );
  typia.assert(memberOrgContext);
  // 5. Create timelogs for the week (Monday April 7 - Sunday April 13, 2025)
  const weekStart = new Date("2025-04-07T00:00:00Z");
  const dates = [
    new Date(weekStart),
    new Date(weekStart.getTime() + 86400000),
    new Date(weekStart.getTime() + 86400000 * 2),
  ];
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: dates[0].toISOString(),
        durationMinutes: 120,
        description: "Morning work session",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: dates[1].toISOString(),
        durationMinutes: 180,
        description: "Afternoon work session",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: dates[2].toISOString(),
        durationMinutes: 240,
        description: "All day work session",
        billable: false,
      },
    },
  );
  typia.assert(timelog3);
  // 6. Create draft timesheet for the week (auto-includes timelogs 1 and 2)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: dates[0].toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  const initialTotalHours = timesheet.totalHours;
  const initialTimelogCount = timesheet.timesheetTimelogs.length;
  // 7. Call PATCH to add timelog3 to timesheet
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.manage(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          addTimelogIds: [timelog3.id],
        } satisfies IErpHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(updatedTimesheet);
  // 8. Validate response returns updated timesheet with new timelogs
  TestValidator.equals(
    "timesheet id unchanged",
    updatedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "has timesheetTimelogs array",
    updatedTimesheet.timesheetTimelogs.length > 0,
  );
  const addedTimelogEntry = updatedTimesheet.timesheetTimelogs.find(
    (entry) => entry.timelog.id === timelog3.id,
  );
  TestValidator.predicate(
    "timelog3 added to timesheetTimelogs",
    addedTimelogEntry !== undefined,
  );
  // 9. Verify totalHours is recalculated correctly
  const timelog3DurationHours = timelog3.durationMinutes / 60;
  const expectedTotalHours = initialTotalHours + timelog3DurationHours;
  TestValidator.equals(
    "totalHours recalculated correctly",
    updatedTimesheet.totalHours,
    expectedTotalHours,
  );
  TestValidator.predicate(
    "timesheetTimelogs count increased",
    updatedTimesheet.timesheetTimelogs.length > initialTimelogCount,
  );
  // 10. Confirm each timelog falls within week date range
  const weekEnd = new Date(weekStart.getTime() + 86400000 * 6);
  for (const entry of updatedTimesheet.timesheetTimelogs) {
    const timelogDate = new Date(entry.timelog.date);
    TestValidator.predicate(
      `timelog ${entry.timelog.id} date within week range`,
      timelogDate >= weekStart && timelogDate <= weekEnd,
    );
  }
}
