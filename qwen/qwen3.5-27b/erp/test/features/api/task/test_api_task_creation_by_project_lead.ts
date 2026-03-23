import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_admin_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_admin_projects_tasks_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task creation by a project lead user.
 *
 * This test validates that a member with project-lead role can create tasks
 * within their assigned project. The test covers:
 * 1. Admin and member authentication
 * 2. Project creation
 * 3. Project membership assignment with project-lead role
 * 4. Task creation with various fields
 * 5. Response validation including creator and project references
 */
export async function test_api_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Member (project lead) authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 3. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: `#${RandomGenerator.alphabets(6)}`,
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project);
  // 4. Assign member as project-lead to the project
  // Note: Using memberAuth.id as employee_id due to scenario constraints
  // In a real system, this would be an employee UUID linked to the member
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          employee_id: memberAuth.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(membership);
  // 5. Create a task as project lead
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Review project requirements",
        description: "Analyze and document project requirements",
        status: "in-progress",
        priority: "medium",
        due_date: null,
        estimated_hours: 8,
        assigned_employee_id: null,
        parent_task_id: null,
      },
    },
  );
  typia.assert(task);
  // 6. Validate task response
  TestValidator.predicate(
    "task has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      task.id,
    ),
  );
  TestValidator.equals(
    "task title matches input",
    task.title,
    "Review project requirements",
  );
  TestValidator.equals(
    "task description matches input",
    task.description,
    "Analyze and document project requirements",
  );
  TestValidator.equals(
    "task status is in-progress",
    task.status,
    "in-progress",
  );
  TestValidator.equals("task priority is medium", task.priority, "medium");
  TestValidator.equals("task due_date is null", task.due_date, null);
  TestValidator.equals("task estimated_hours is 8", task.estimated_hours, 8);
  TestValidator.equals(
    "task assignedEmployee is null",
    task.assignedEmployee,
    null,
  );
  TestValidator.equals(
    "task createdByMember matches creator",
    task.createdByMember.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "task project matches created project",
    task.project.id,
    project.id,
  );
  TestValidator.predicate(
    "task has created_at timestamp",
    task.created_at !== undefined,
  );
  TestValidator.predicate(
    "task has updated_at timestamp",
    task.updated_at !== undefined,
  );
}
