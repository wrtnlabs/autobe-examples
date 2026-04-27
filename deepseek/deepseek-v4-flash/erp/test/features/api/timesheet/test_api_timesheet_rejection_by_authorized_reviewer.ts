import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

export async function test_api_timesheet_rejection_by_authorized_reviewer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registers
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    },
  });
  typia.assert(memberA);
  // 2. Member A creates an organization
  const org =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(org);
  // 3. Member B registers (different email)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
    },
  });
  typia.assert(memberB);
  // 4. Member A creates a custom role with time:approve permission
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberAConnection,
      {
        params: { organizationId: org.id },
        body: {
          name: "Timesheet Approver",
          permissions: ["time:approve"],
        },
      },
    );
  typia.assert(role);
  // 5. Member A invites Member B with the custom role — auto-creates active Employee B
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberBEmail,
          role_id: role.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Member B switches to the organization context
  const switchedOrg =
    await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
      memberBConnection,
      { organizationId: org.id },
    );
  typia.assert(switchedOrg);
  // 7. Re-login Member A to get refreshed employee records (including org owner employee)
  const memberARefreshed = await authorize_member_login(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: "",
      referrer: "",
    },
  });
  typia.assert(memberARefreshed);
  const employeeAId = memberARefreshed.employees[0]!.id;
  // 8. Member A creates a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {},
    );
  typia.assert(project);
  // 9. Member A adds themselves as a project member (required for timelog creation)
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeAId,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 10. Member A creates a timelog within the current work week
  const weekStartDate = "2026-04-20";
  const timelogDate = "2026-04-22T00:00:00.000Z";
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      memberAConnection,
      {
        body: {
          date: timelogDate,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
          project_id: project.id,
        },
      },
    );
  typia.assert(timelog);
  // 11. Member A creates a draft timesheet for the current week (auto-includes timelog)
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      memberAConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // 12. Member A submits the timesheet → status becomes 'submitted'
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      memberAConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // 13. Member B rejects the submitted timesheet
  const rejectionReason = "Insufficient detail in timelog descriptions";
  const rejectedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.reject(
      memberBConnection,
      {
        timesheetId: timesheet.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IHrmTimeTrackingTimesheet.IReject,
      },
    );
  typia.assert(rejectedTimesheet);
  // 14. Validate rejection results
  TestValidator.equals("status is draft", rejectedTimesheet.status, "draft");
  TestValidator.equals(
    "rejection reason matches",
    rejectedTimesheet.rejectionReason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewedAt is set",
    () =>
      rejectedTimesheet.reviewedAt !== null &&
      rejectedTimesheet.reviewedAt !== undefined,
  );
  TestValidator.predicate(
    "reviewer is Member B",
    () => rejectedTimesheet.reviewer?.id === memberB.id,
  );
  TestValidator.predicate(
    "reviewer differs from owner",
    () => rejectedTimesheet.reviewer?.id !== memberA.id,
  );
}