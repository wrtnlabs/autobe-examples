import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_submit_rejected_when_already_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // The owner of the organization is the current member's organization member record
  const organizationMemberId = organization.owner.id;
  // 3. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 4. Add the member as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          organizationMemberId: organizationMemberId,
          projectRole: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 5. Create a draft timesheet for the current week
  // Current date: 2026-03-16 (Monday), weekStartDate = Monday, weekEndDate = Sunday
  const weekStartDate = "2026-03-16T00:00:00.000Z";
  const weekEndDate = "2026-03-22T00:00:00.000Z";
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStartDate,
        weekEndDate: weekEndDate,
      },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals(
    "timesheet initial status is draft",
    timesheet.status,
    "draft",
  );
  // 6. Create a timelog for a date within the timesheet's week
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        work_date: "2026-03-17T00:00:00.000Z",
        duration_minutes: 60,
        billable: false,
      },
    },
  );
  typia.assert(timelog);
  // 7. Link the timelog to the timesheet via PUT /erpHrm/member/timelogs/{timelogId}
  // Update the timelog to ensure it stays within the correct week context
  const updatedTimelog = await api.functional.erpHrm.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body: {
        work_date: "2026-03-17T00:00:00.000Z",
        duration_minutes: 60,
      } satisfies IErpHrmTimelog.IUpdate,
    },
  );
  typia.assert(updatedTimelog);
  // PRE-CONDITION: Submit the timesheet for the first time (draft -> submitted)
  const firstSubmission = await api.functional.erpHrm.member.timesheets.submit(
    memberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(firstSubmission);
  TestValidator.equals(
    "first submission status is submitted",
    firstSubmission.status,
    "submitted",
  );
  TestValidator.predicate(
    "first submission has submittedAt",
    firstSubmission.submittedAt !== null,
  );
  // TEST ACTION: Attempt to submit the timesheet a SECOND TIME (should fail)
  // The timesheet is now in 'submitted' status and cannot be re-submitted
  await TestValidator.error(
    "second submit of already-submitted timesheet should be rejected",
    async () => {
      await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
}
