import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Verify task visibility is restricted by project membership - regular members see only their assigned project tasks.
 *
 * Validates the access control specification for task listing: regular project members view only tasks from their project memberships, while managers/owners view all organizational tasks. Tests the complete workflow including project creation, task creation across multiple projects, employee invitation, and selective project assignment.
 *
 * The test ensures that project membership scope correctly filters task visibility, preventing unauthorized access to tasks in projects where the employee is not a member.
 *
 * 1. First member joins the platform and creates a default organization.
 * 2. First member creates Project A and Project B.
 * 3. First member creates multiple tasks in each project.
 * 4. Second member joins the platform.
 * 5. First member invites second member as an employee in their organization.
 * 6. First member assigns second member to Project A only (not Project B).
 * 7. Second member queries tasks - verifies only Project A tasks are visible.
 * 8. First member queries tasks - verifies all tasks from both projects are visible.
 */
export async function test_api_task_access_control_membership_scope(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member (organization owner/manager) joins the platform
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "",
    referrer: "",
  } satisfies IHrmPlatformMember.IJoin;
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: firstMemberJoinBody,
  });
  typia.assert(firstMember);
  // 2. First member creates Project A and Project B
  const projectA = await generate_random_hrm_platform_member_projects_create(
    firstMemberConnection,
    {
      body: {
        name: `Project-A-${RandomGenerator.alphabets(8)}`,
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(projectA);
  const projectB = await generate_random_hrm_platform_member_projects_create(
    firstMemberConnection,
    {
      body: {
        name: `Project-B-${RandomGenerator.alphabets(8)}`,
        color_code: "#33FF57",
      },
    },
  );
  typia.assert(projectB);
  // 3. First member creates tasks in Project A
  const taskA1 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      firstMemberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `Task A1 - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        },
      },
    );
  typia.assert(taskA1);
  const taskA2 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      firstMemberConnection,
      {
        params: { projectId: projectA.id },
        body: {
          title: `Task A2 - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        },
      },
    );
  typia.assert(taskA2);
  // 4. First member creates tasks in Project B
  const taskB1 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      firstMemberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: `Task B1 - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        },
      },
    );
  typia.assert(taskB1);
  const taskB2 =
    await generate_random_hrm_platform_member_projects_tasks_create(
      firstMemberConnection,
      {
        params: { projectId: projectB.id },
        body: {
          title: `Task B2 - ${RandomGenerator.paragraph({ sentences: 3 })}`,
        },
      },
    );
  typia.assert(taskB2);
  // Collect expected task IDs for validation
  const projectATaskIds = new Set([taskA1.id, taskA2.id]);
  const projectBTaskIds = new Set([taskB1.id, taskB2.id]);
  const allTaskIds = new Set([...projectATaskIds, ...projectBTaskIds]);
  // 5. Second member (regular employee) joins the platform
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: "",
    referrer: "",
  } satisfies IHrmPlatformMember.IJoin;
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: secondMemberJoinBody,
  });
  typia.assert(secondMember);
  // 6. First member invites second member as employee in their organization
  const employee = await generate_random_hrm_platform_member_employees_create(
    firstMemberConnection,
    {
      body: {
        memberId: secondMember.id,
      },
    },
  );
  typia.assert(employee);
  // 7. First member assigns second member to Project A only (not Project B)
  await generate_random_hrm_platform_member_projects_memberships_create(
    firstMemberConnection,
    {
      params: { projectId: projectA.id },
      body: {
        employeeId: employee.id,
        capacityRole: "member",
      },
    },
  );
  // 8. Second member queries tasks - should see ONLY Project A tasks
  const secondMemberTasks = await api.functional.hrmPlatform.member.tasks.index(
    secondMemberConnection,
    {
      body: {} satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(secondMemberTasks);
  const secondMemberTaskIds = new Set(secondMemberTasks.data.map((t) => t.id));
  // Verify second member sees Project A tasks
  for (const id of projectATaskIds) {
    TestValidator.predicate(
      `second member sees Project A task ${id}`,
      secondMemberTaskIds.has(id),
    );
  }
  // Verify second member does NOT see Project B tasks
  for (const id of projectBTaskIds) {
    TestValidator.predicate(
      `second member does NOT see Project B task ${id}`,
      !secondMemberTaskIds.has(id),
    );
  }
  // 9. First member (owner/manager) queries tasks - should see ALL tasks from both projects
  const firstMemberTasks = await api.functional.hrmPlatform.member.tasks.index(
    firstMemberConnection,
    {
      body: {} satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(firstMemberTasks);
  const firstMemberTaskIds = new Set(firstMemberTasks.data.map((t) => t.id));
  // Verify first member sees all tasks from both projects
  for (const id of allTaskIds) {
    TestValidator.predicate(
      `first (owner) member sees all task ${id}`,
      firstMemberTaskIds.has(id),
    );
  }
  // Validate that first member sees more tasks than second member (ownership advantage)
  TestValidator.predicate(
    "first member sees more tasks than second member",
    firstMemberTaskIds.size > secondMemberTaskIds.size ||
      (firstMemberTaskIds.size === secondMemberTaskIds.size &&
        projectBTaskIds.size === 0),
  );
}
