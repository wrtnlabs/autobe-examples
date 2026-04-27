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
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingRole";
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
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_project_member_removal_with_open_task_clearance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (org admin)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create an organization with member A as owner
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Look up the built-in 'Employee' role
  const rolePage =
    await api.functional.hrmTimeTracking.member.organizations.roles.index(
      memberAConnection,
      {
        organizationId: organization.id,
        body: {
          type: "built_in" as const,
          limit: 100 satisfies number as number,
        } satisfies IHrmTimeTrackingRole.IRequest,
      },
    );
  typia.assert(rolePage);
  const employeeRole = rolePage.data.find((r) => r.name === "Employee");
  if (employeeRole === undefined) throw new Error("Employee role not found");
  // 5. Invite member B's email to the organization (auto-creates employee record)
  const invitation =
    await generate_random_hrm_time_tracking_member_invitations_create(
      memberAConnection,
      {
        body: {
          email: memberB.email satisfies string as string,
          role_id: employeeRole.id,
        },
      },
    );
  typia.assert(invitation);
  // 6. Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {},
    );
  typia.assert(project);
  // Get member B's employee record from the authorized response
  const memberBEmployee = memberB.employees.find(
    (e) => e.member.id === memberB.id,
  );
  if (memberBEmployee === undefined) {
    throw new Error("Member B's employee record not found after invitation");
  }
  // 7. Add member B's employee as a project member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberAConnection,
      {
        body: {
          employee_id: memberBEmployee.id satisfies string as string,
          role: "member" as const,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 8. Create a task assigned to member B's employee
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberAConnection,
      {
        body: {
          employee_id: memberBEmployee.id satisfies string as string,
          title: RandomGenerator.paragraph({ sentences: 1 }),
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 9. Execute the target DELETE operation to remove member B from the project
  await api.functional.hrmTimeTracking.member.projects.members.erase(
    memberAConnection,
    {
      projectId: project.id,
      memberId: projectMember.id,
    },
  );
}
