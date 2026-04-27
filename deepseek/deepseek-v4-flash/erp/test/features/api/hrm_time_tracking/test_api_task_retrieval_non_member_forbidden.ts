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

export async function test_api_task_retrieval_non_member_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup Member A (Owner) ----
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(16);
  const memberAJoinResult = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
    },
  });
  typia.assert(memberAJoinResult);
  // Create organization — Member A becomes Owner employee
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // Login again to obtain the updated employee record (includes owner employee created by org creation)
  const memberAAuthorized = await authorize_member_login(memberAConnection, {
    body: {
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string>(),
      referrer: typia.random<string>(),
    } satisfies IHrmTimeTrackingMember.ILogin,
  });
  typia.assert(memberAAuthorized);
  const memberAEmployee = memberAAuthorized.employees[0];
  typia.assert(memberAEmployee);
  // Create project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      memberAConnection,
      {},
    );
  typia.assert(project);
  // Add Member A as project member with 'member' role
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      memberAConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: memberAEmployee.id,
          role: "member",
        } satisfies IHrmTimeTrackingProjectMember.ICreate,
      },
    );
  typia.assert(projectMember);
  // Create task
  const task =
    await generate_random_hrm_time_tracking_member_projects_tasks_create(
      memberAConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(task);
  // ---- Setup Member B (different employee, NOT project member) ----
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ---- Attempt to retrieve task as non-project-member should fail with 403 ----
  await TestValidator.httpError(
    "non-project-member cannot retrieve task",
    403,
    async () => {
      await api.functional.hrmTimeTracking.member.projects.tasks.at(
        memberBConnection,
        {
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}