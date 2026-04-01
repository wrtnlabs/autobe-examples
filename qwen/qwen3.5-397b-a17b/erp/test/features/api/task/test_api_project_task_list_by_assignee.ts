import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

export async function test_api_project_task_list_by_assignee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create first task assigned to a specific employee
  const task1 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "high",
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(task1);
  // 4. Create second task assigned to the SAME employee as task1
  const task2 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "in-progress",
        priority: "medium",
        description: RandomGenerator.content({ paragraphs: 1 }),
        hrm_platform_employee_id: task1.assignee?.id ?? undefined,
      },
    },
  );
  typia.assert(task2);
  // 5. Create third task without assignee (unassigned)
  const task3 = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        status: "open",
        priority: "low",
        description: RandomGenerator.content({ paragraphs: 1 }),
        hrm_platform_employee_id: null,
      },
    },
  );
  typia.assert(task3);
  // 6. Filter tasks by the assignee of task1
  const targetEmployeeId = task1.assignee?.id;
  const filteredResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_platform_employee_id: targetEmployeeId,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(filteredResult);
  // 7. Validate filtered results
  TestValidator.predicate(
    "filtered count matches assigned tasks",
    () => filteredResult.data.length === 2,
  );
  TestValidator.predicate("all filtered tasks have correct assignee", () =>
    filteredResult.data.every((task) => task.assignee?.id === targetEmployeeId),
  );
  TestValidator.predicate(
    "unassigned task not included in filtered results",
    () => !filteredResult.data.some((task) => task.id === task3.id),
  );
  TestValidator.equals(
    "pagination records count",
    filteredResult.pagination.records,
    2,
  );
  // 8. Validate assignee information structure
  const firstTask = filteredResult.data[0];
  if (firstTask.assignee) {
    TestValidator.predicate(
      "assignee has user information",
      () => firstTask.assignee!.user !== null,
    );
    TestValidator.predicate(
      "assignee has role information",
      () => firstTask.assignee!.role !== null,
    );
    TestValidator.predicate(
      "assignee user has display name",
      () => firstTask.assignee!.user.display_name !== null,
    );
  }
  // 9. Test filtering by null assignee (unassigned tasks)
  const unassignedResult =
    await api.functional.hrmPlatform.member.projects.tasks.index(
      memberConnection,
      {
        projectId: project.id,
        body: {
          hrm_platform_employee_id: null,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTask.IRequest,
      },
    );
  typia.assert(unassignedResult);
  TestValidator.predicate(
    "unassigned filter returns only unassigned tasks",
    () => unassignedResult.data.every((task) => task.assignee === null),
  );
  TestValidator.predicate(
    "unassigned count is correct",
    () => unassignedResult.data.length === 1,
  );
}