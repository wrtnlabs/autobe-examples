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

export async function test_api_timesheet_submission_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin account (creates organization with owner)
  const adminPassword = "Admin123!@#";
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      password: adminPassword,
    },
  });
  // 2. Admin login to get fresh session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
      href: "http://localhost/test",
      referrer: "http://localhost/test",
    },
  });
  // 3. Admin creates a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminLoginConnection,
    {},
  );
  // Get project ID and organization ID from the first item in the budget report
  const projectEntry = project.items[0];
  const projectId = projectEntry.projectId;
  const organizationId =
    (projectEntry as any).organizationId ?? (adminAuth as any).organizationId;
  // 4. Register member account (joins the organization)
  const memberPassword = "Member123!@#";
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      password: memberPassword,
    },
  });
  // 5. Member login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
      href: "http://localhost/test",
      referrer: "http://localhost/test",
    },
  });
  // 6. Set organization context (member joins the admin's organization)
  // First need to find the organization - let's get it from admin auth
  const adminOrgId = (adminAuth as any).organization?.id ?? organizationId;
  if (!adminOrgId) {
    // Try to get organization from admin's authorized response
    const adminMemberId = (adminAuth as any).member?.id ?? adminAuth.id;
    // Use the admin's organization context if available
    const orgContext =
      await generate_random_erp_hrm_member_organization_context_select(
        memberLoginConnection,
        {
          body: {
            organizationId: adminMemberId as any,
          },
        },
      );
    typia.assert(orgContext);
  }
  // Set organization context using the project's organization
  const orgContext2 =
    await generate_random_erp_hrm_member_organization_context_select(
      memberLoginConnection,
      {
        body: {
          organizationId: adminOrgId as any,
        },
      },
    );
  typia.assert(orgContext2);
  // 7. Create a timelog with date in current week (Monday-Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberLoginConnection,
    {
      body: {
        projectId: projectId,
        date: monday.toISOString(),
        durationMinutes: 120,
        description: "Test timelog for timesheet submission",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 8. Create draft timesheet (auto-includes timelogs from the week)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberLoginConnection,
    {
      body: {
        weekStartDate: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Validate draft state
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "submittedAt is null initially",
    timesheet.submittedAt,
    null,
  );
  // Calculate expected total hours from timelogs
  const expectedTotalMinutes = timesheet.timesheetTimelogs.reduce(
    (sum, tt) => sum + tt.timelog.durationMinutes,
    0,
  );
  const expectedTotalHours = expectedTotalMinutes / 60;
  // 9. Submit the draft timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(
      memberLoginConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 10. Validate submission results
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt is recorded",
    submittedTimesheet.submittedAt !== null,
  );
  TestValidator.equals(
    "totalHours matches",
    submittedTimesheet.totalHours,
    expectedTotalHours,
  );
  TestValidator.predicate(
    "contains timelogs",
    submittedTimesheet.timesheetTimelogs.length > 0,
  );
}
