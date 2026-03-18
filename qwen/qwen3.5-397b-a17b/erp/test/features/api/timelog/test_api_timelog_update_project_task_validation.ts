import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

export async function test_api_timelog_update_project_task_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authenticated connection
  const memberAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create member-specific connection for subsequent operations
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 4. Create employee record for the member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        role_id: typia.random<string & tags.Format<"uuid">>(),
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 5. Create Project A
  const projectA = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project A - " + RandomGenerator.name(),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  // 6. Create Project B
  const projectB = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project B - " + RandomGenerator.name(),
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(projectB);
  // 7. Assign employee to Project A
  const memberA =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(memberA);
  // 8. Assign employee to Project B
  const memberB =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          hrm_platform_employee_id: employee.id,
          role: "member",
        },
      },
    );
  typia.assert(memberB);
  // 9. Create task in Project A
  const taskA = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: projectA.id },
      body: {
        title: "Task A - " + RandomGenerator.name(),
      },
    },
  );
  typia.assert(taskA);
  // 10. Create task in Project B
  const taskB = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: projectB.id },
      body: {
        title: "Task B - " + RandomGenerator.name(),
      },
    },
  );
  typia.assert(taskB);
  // 11. Create initial timelog on Project A without task
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: projectA.id,
        task_id: null,
        date: new Date().toISOString(),
        duration_minutes: 60,
        description: "Initial timelog on Project A",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 12. Test invalid update: Change project to B but use task from A (should fail)
  await TestValidator.error(
    "timelog update with mismatched task and project",
    async () => {
      await api.functional.hrmPlatform.member.timelogs.update(
        memberConnection,
        {
          timelogId: timelog.id,
          body: {
            project_id: projectB.id,
            task_id: taskA.id,
          } satisfies IHrmPlatformTimelog.IUpdate,
        },
      );
    },
  );
  // 13. Test valid update: Change project to B with task from B (should succeed)
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: timelog.id,
      body: {
        project_id: projectB.id,
        task_id: taskB.id,
        description: "Updated timelog on Project B with Task B",
      } satisfies IHrmPlatformTimelog.IUpdate,
    });
  typia.assert(updatedTimelog);
  // 14. Validate the update was successful
  TestValidator.equals(
    "project_id updated correctly",
    updatedTimelog.project.id,
    projectB.id,
  );
  TestValidator.equals(
    "task_id updated correctly",
    updatedTimelog.task?.id,
    taskB.id,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedTimelog.description,
    "Updated timelog on Project B with Task B",
  );
}
