import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_projects_tasks_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_tasks_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_task } from "../../../prepare/prepare_random_hrm_time_tracking_task";

export async function test_api_task_retrieval_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member and store credentials for re-login
  const memberConnection: api.IConnection = { host: connection.host };
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(16);
  const authorized: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
      } satisfies DeepPartial<IHrmTimeTrackingMember.IJoin>,
    });
  typia.assert(authorized);
  // 2. Create an organization - member becomes Owner employee
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-login to get fresh member data with employee records
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed: IHrmTimeTrackingMember.IAuthorized =
    await authorize_member_login(refreshedConnection, {
      body: {
        email,
        password,
        href: "",
        referrer: "",
      } satisfies IHrmTimeTrackingMember.ILogin,
    });
  typia.assert(refreshed);
  // 4. Extract the employee ID for the owner employee
  const employee: IHrmTimeTrackingEmployee.ISummary = refreshed.employees[0];
  const employeeId: string = employee.id;
  // 5. Create a project
  const project: IHrmTimeTrackingProject =
    await generate_random_hrm_time_tracking_member_projects_create(
      refreshedConnection,
      {},
    );
  typia.assert(project);
  // 6. Add the authenticated employee as a project member
  const projectMember: IHrmTimeTrackingProjectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      refreshedConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: employeeId,
          role: "member" as const,
        } satisfies DeepPartial<IHrmTimeTrackingProjectMember.ICreate>,
      },
    );
  typia.assert(projectMember);
  // 7. Create a task within the project
  const task: IHrmTimeTrackingTask =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      refreshedConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(task);
  // 8. Soft-delete the task via DELETE endpoint erase
  await api.functional.hrmTimeTracking.member.projects.tasks.erase(
    refreshedConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
  // 9. Attempt to retrieve the soft-deleted task expect 404 Not Found
  await TestValidator.httpError(
    "retrieve soft-deleted task returns 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.at(
        refreshedConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}