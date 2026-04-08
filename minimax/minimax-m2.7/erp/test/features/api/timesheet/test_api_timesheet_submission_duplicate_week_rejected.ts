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

export async function test_api_timesheet_submission_duplicate_week_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin setup - join and set organization context
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
  // Admin sets organization context (creates organization automatically on first join)
  const adminOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      adminConnection,
      {},
    );
  // Step 2: Member join and set organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Member joins the same organization as admin
  await api.functional.erpHrm.member.organization_context.select(
    memberConnection,
    {
      body: {
        organizationId: adminOrgContext.organization.id,
      },
    },
  );
  // Step 3: Create project (admin) - need to call SDK directly to get project with id
  const projectInput = prepare_random_erp_hrm_project({});
  const projectResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: projectInput,
    },
  );
  const project = typia.assert<IErpHrmProject>(projectResponse);
  // Get project id from budget report items if available, otherwise use first item's projectId
  const projectId =
    project.items.length > 0
      ? project.items[0].projectId
      : typia.random<string & tags.Format<"uuid">>();
  // Step 4: Create timelog for the member in the same week
  const mondayDate = getMonday(new Date());
  const timelogDate = mondayDate.toISOString().split("T")[0];
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: projectId,
        date: timelogDate + "T00:00:00.000Z",
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // Step 5: Create first timesheet for the week and submit it
  const timesheetInput = prepare_random_erp_hrm_timesheet({
    weekStartDate: mondayDate.toISOString(),
  });
  const firstTimesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: timesheetInput,
    },
  );
  typia.assert(firstTimesheet);
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: firstTimesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "first timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // Step 6: Create second timesheet for the same week
  const secondTimesheet = await api.functional.erpHrm.member.timesheets.create(
    memberConnection,
    {
      body: timesheetInput,
    },
  );
  typia.assert(secondTimesheet);
  TestValidator.equals(
    "second timesheet status is draft",
    secondTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "second timesheet same week as first",
    secondTimesheet.weekStartDate,
    firstTimesheet.weekStartDate,
  );
  // Step 7: Attempt to submit the duplicate week timesheet - expect 409 conflict
  await TestValidator.httpError(
    "submitting duplicate week timesheet should return 409 conflict",
    409,
    async () => {
      await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
        timesheetId: secondTimesheet.id,
      });
    },
  );
}
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
