import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_approval_for_draft_status_error(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner (has full admin rights including time:approve permission)
  const ownerJoinResult = await authorize_member_join(connection, {
    body: {
      displayName: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(ownerJoinResult);
  const ownerConnection: api.IConnection = { host: connection.host };
  ownerConnection.headers = { Authorization: ownerJoinResult.token.access };
  // Create organization for the owner
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 2: Create a second user as employee for timesheet ownership
  const employeeJoinResult = await authorize_member_join(connection, {
    body: {
      displayName: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(employeeJoinResult);
  const employeeConnection: api.IConnection = { host: connection.host };
  employeeConnection.headers = {
    Authorization: employeeJoinResult.token.access,
  };
  // Create employee record for the second user in the organization
  const employee = await generate_random_erp_hrm_member_employees_create(
    ownerConnection,
    {
      body: {
        email: employeeJoinResult.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employee);
  // Step 3: Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 4: Create timelogs for the employee during a work week
  // Calculate Monday of current week for timesheet
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() + mondayOffset);
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const weekStartDatePlusOne = new Date(weekStartDate);
  weekStartDatePlusOne.setDate(weekStartDate.getDate() + 1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDatePlusOne.toISOString(),
        duration: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<480>
        >(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  // Step 5: Create a draft timesheet (NOT submitted - remains in 'draft' status)
  // The create endpoint creates timesheets in 'draft' status by default
  const draftTimesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(draftTimesheet);
  // Pre-validation: Verify timesheet is in draft status before attempting approval
  TestValidator.equals(
    "timesheet status is draft before approval attempt",
    draftTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "reviewer is null for draft timesheet",
    draftTimesheet.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for draft timesheet",
    draftTimesheet.reviewed_at,
    null,
  );
  const timesheetId = draftTimesheet.id;
  // Step 6: Attempt to approve the draft timesheet
  // Business rule: Only timesheets with 'submitted' status can be approved
  // Expected: 400 Bad Request with error message about status validation
  await TestValidator.httpError(
    "approval rejected for draft timesheet returns 400",
    400,
    async () => {
      await api.functional.erpHrm.member.timesheets.approve(ownerConnection, {
        timesheetId,
      });
    },
  );
}
