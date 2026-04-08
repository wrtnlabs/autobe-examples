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

export async function test_api_timesheet_timelog_modification_blocked_on_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Set organization context
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {},
  );
  // 3. Create project for timelog assignment using direct API call
  const project = await api.functional.erpHrm.admin.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // Access project ID - using type-safe access with fallback
  const projectId = (
    project as unknown as {
      id?: string;
    }
  ).id;
  if (!projectId) {
    throw new Error("Failed to create project - no ID returned");
  }
  // 4. Create timelogs within the week
  const currentDate = new Date();
  const mondayOfWeek = new Date(currentDate);
  mondayOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
  mondayOfWeek.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: mondayOfWeek.toISOString(),
        durationMinutes: 120,
        description: "Test timelog 1",
        billable: true,
      },
    },
  );
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: new Date(mondayOfWeek.getTime() + 86400000).toISOString(),
        durationMinutes: 90,
        description: "Test timelog 2",
        billable: true,
      },
    },
  );
  // 5. Create draft timesheet and submit it for approval
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: mondayOfWeek.toISOString(),
      },
    },
  );
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 6. Authenticate as admin via join and set organization context
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Set organization context for admin
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    {},
  );
  // 7. Approve the submitted timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.admin.timesheets.approve(adminConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(approvedTimesheet);
  // Verify timesheet is in approved status
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  // 8. Re-authenticate as member to attempt modification
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection2, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Re-set organization context for member
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection2,
    {},
  );
  // 9. Attempt to add timelogs via PATCH to the approved timesheet
  // 10. Validate the request is rejected
  await TestValidator.error(
    "cannot modify timelogs on approved timesheet",
    async () => {
      await api.functional.erpHrm.member.timesheets.timelogs.manage(
        memberConnection2,
        {
          timesheetId: approvedTimesheet.id,
          body: {
            addTimelogIds: [timelog1.id],
          } satisfies IErpHrmTimesheetTimelog.IRequest,
        },
      );
    },
  );
  // 11. Verify timesheet status remains approved
  TestValidator.equals(
    "timesheet remains approved after failed modification attempt",
    approvedTimesheet.status,
    "approved",
  );
}
