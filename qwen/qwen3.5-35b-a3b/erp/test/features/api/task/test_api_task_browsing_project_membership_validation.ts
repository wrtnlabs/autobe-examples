import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTaskAnalyticGrouping } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskAnalyticGrouping";
import type { IHrmsTaskParentTaskFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskParentTaskFilter";
import type { IHrmsTaskPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskPriority";
import type { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { generate_random_hrms_member_projects_tasks_create } from "../../../generate/generate_random_hrms_member_projects_tasks_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";
import { prepare_random_hrms_task } from "../../../prepare/prepare_random_hrms_task";

export async function test_api_task_browsing_project_membership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate User A via member join
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuth = await authorize_member_join(userAConnection, {});
  typia.assert(userAAuth);
  // 2. Create organization membership for User A (use their default org)
  const userAMembership =
    await generate_random_hrms_member_organization_members_create(
      userAConnection,
      {
        body: {},
      },
    );
  typia.assert(userAMembership);
  const organizationId = userAMembership.organization.id;
  const organizationRoleId = userAMembership.organizationRole.id;
  // 3. Create project in User A's organization
  const project =
    await generate_random_hrms_member_organizations_projects_create(
      userAConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: { organizationId },
      },
    );
  typia.assert(project);
  // Project type is dashboard type without id, cast to ISummary to access id
  const projectId: string = (project as unknown as IHrmsProject.ISummary).id;
  // 4. Add User A as project-lead to project
  const userAProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      userAConnection,
      {
        body: {
          employee_id: userAAuth.id,
          role: "project-lead",
        },
        params: { projectId },
      },
    );
  typia.assert(userAProjectMember);
  // 5. Create tasks in project assigned to User A
  const tasksAssignedToUserA = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_hrms_member_projects_tasks_create(
      userAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          hrms_employee_id: userAAuth.id,
        },
        params: { projectId },
      },
    );
  });
  typia.assert(tasksAssignedToUserA);
  // 6. User A views tasks (project-lead should see ALL tasks in project)
  const userATaskQuery: IHrmsTask.IRequest = {
    projectIds: [projectId],
    limit: 100,
    page: 1,
  };
  const userATasksResponse = await api.functional.hrms.member.tasks.index(
    userAConnection,
    {
      body: userATaskQuery,
    },
  );
  typia.assert(userATasksResponse);
  const userATasks = userATasksResponse.data;
  // 7. User A should see all tasks assigned to them in the project
  TestValidator.equals(
    "user A sees assigned tasks count",
    userATasks.length,
    tasksAssignedToUserA.length,
  );
  // 8. Authenticate User B via member join
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuth = await authorize_member_join(userBConnection, {});
  typia.assert(userBAuth);
  // 9. Create organization membership for User B in same organization as User A
  const userBMembership =
    await generate_random_hrms_member_organization_members_create(
      userBConnection,
      {
        body: {},
      },
    );
  typia.assert(userBMembership);
  const userBOrganizationId = userBMembership.organization.id;
  const userBRole = userBMembership.organizationRole.id;
  // 10. Add User B as regular member to User A's project
  const userBProjectMember =
    await generate_random_hrms_member_projects_members_add_member(
      userBConnection,
      {
        body: {
          employee_id: userBAuth.id,
          role: "member",
        },
        params: { projectId },
      },
    );
  typia.assert(userBProjectMember);
  // 11. Create second project in User B's organization (User B not member of this project)
  const userBProject =
    await generate_random_hrms_member_organizations_projects_create(
      userBConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
        },
        params: { organizationId: userBOrganizationId },
      },
    );
  typia.assert(userBProject);
  const userBProjectId: string = (
    userBProject as unknown as IHrmsProject.ISummary
  ).id;
  // 12. Create tasks in User B's project assigned to User A (User B is NOT a member of this project)
  const tasksInUserBProjectAssignedToUserA = await ArrayUtil.asyncRepeat(
    2,
    async () => {
      return await generate_random_hrms_member_projects_tasks_create(
        userBConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 1,
              wordMin: 3,
              wordMax: 5,
            }),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            hrms_employee_id: userAAuth.id,
          },
          params: { projectId: userBProjectId },
        },
      );
    },
  );
  typia.assert(tasksInUserBProjectAssignedToUserA);
  // 13. User B views tasks (should only see tasks in projects they're member of + assigned tasks)
  const userBTaskQuery: IHrmsTask.IRequest = {
    projectIds: [projectId, userBProjectId],
    limit: 100,
    page: 1,
  };
  const userBTasksResponse = await api.functional.hrms.member.tasks.index(
    userBConnection,
    {
      body: userBTaskQuery,
    },
  );
  typia.assert(userBTasksResponse);
  const userBTasks = userBTasksResponse.data;
  // 14. User B should NOT see tasks from User B's project (not a member, even if assigned to User A)
  const tasksFromUserBProject = userBTasks.filter(
    (t) => t.project_id === userBProjectId,
  );
  TestValidator.equals(
    "user B does not see tasks from project B (not member)",
    tasksFromUserBProject.length,
    0,
  );
  // 15. User B should see tasks from project where they're a member (projectId)
  const tasksFromProjectBIsMember = userBTasks.filter(
    (t) => t.project_id === projectId,
  );
  TestValidator.equals(
    "user B sees tasks from project they're member of",
    tasksFromProjectBIsMember.length,
    tasksAssignedToUserA.length,
  );
}
