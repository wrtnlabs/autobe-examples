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
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_approval_by_authorized_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register reviewer member and create connection
  const reviewerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(reviewerConnection, {});
  // 2. Register employee member and create connection
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  // 3. Reviewer creates organization (becomes Owner with time:approve permission)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      reviewerConnection,
      {},
    );
  typia.assert(organization);
  // Get the owner role id from the organization's owner member
  const ownerRoleId = organization.owner.role.id;
  // 4. Add employee to the organization (reviewer as owner can manage org)
  const employeeMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      reviewerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: ownerRoleId,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(employeeMember);
  // 5. Reviewer creates a project
  const project = await generate_random_erp_hrm_member_projects_create(
    reviewerConnection,
    {},
  );
  typia.assert(project);
  // 6. Add employee to the project (reviewer has project:manage permission as owner)
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      reviewerConnection,
      {
        body: {
          organizationMemberId: employeeMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 7. Employee creates a timelog for the project
  // Use a work_date that falls within the week of 2024-01-08 (Mon) to 2024-01-14 (Sun)
  const workDate = "2024-01-10T00:00:00.000Z"; // Wednesday of that week
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    employeeConnection,
    {
      body: {
        project_id: project.id,
        work_date: workDate,
        duration_minutes: 60,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 8. Employee creates a draft timesheet covering the week
  // weekStartDate must be a Monday, weekEndDate must be exactly 6 days after (Sunday)
  const weekStartDate = "2024-01-08T00:00:00.000Z"; // Monday
  const weekEndDate = "2024-01-14T00:00:00.000Z"; // Sunday (exactly 6 days after)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        weekStartDate,
        weekEndDate,
      },
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 9. Employee submits the timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 10. Reviewer approves the timesheet (target action)
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(reviewerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  // Validations
  TestValidator.equals(
    "timesheet status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewer is set",
    approvedTimesheet.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewedAt is set",
    approvedTimesheet.reviewedAt !== null,
  );
  TestValidator.predicate(
    "submittedAt is preserved",
    approvedTimesheet.submittedAt !== null,
  );
  TestValidator.equals(
    "rejectionReason is null",
    approvedTimesheet.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "timelogs array is non-empty",
    approvedTimesheet.timelogs.length > 0,
  );
  // Confirm reviewer and owner are different people (no self-approval)
  const reviewer = approvedTimesheet.reviewer!;
  TestValidator.notEquals(
    "reviewer and owner are different",
    reviewer.id,
    approvedTimesheet.owner.id,
  );
}
