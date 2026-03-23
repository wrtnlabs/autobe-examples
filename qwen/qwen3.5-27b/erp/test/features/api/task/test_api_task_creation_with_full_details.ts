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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test task creation with full details including title, description, status, priority, due date, estimated hours.
 * Validates that all task fields are correctly stored and relationships are properly established.
 */
export async function test_api_task_creation_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project for the task
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        color_code: "#FF5733",
        budget_hours: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  typia.assert(project);
  // 3. Create task with full details
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Implement user authentication system",
        description:
          "Build comprehensive login and registration functionality with JWT tokens and password hashing",
        status: "open",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 40,
        assigned_employee_id: null,
        parent_task_id: null,
      },
    },
  );
  typia.assert(task);
  // 4. Validate task creation response
  TestValidator.equals(
    "task title matches input",
    task.title,
    "Implement user authentication system",
  );
  TestValidator.equals("task status is open", task.status, "open");
  TestValidator.equals("task priority is high", task.priority, "high");
  // Validate due_date (nullable, but we provided a value)
  typia.assertGuard(task.due_date!);
  TestValidator.predicate(
    "due date is in the future",
    new Date(task.due_date) > new Date(),
  );
  TestValidator.equals("estimated hours is 40", task.estimated_hours, 40);
  TestValidator.equals("task is not assigned", task.assignedEmployee, null);
  TestValidator.equals("task is not a subtask", task.parentTask, null);
  TestValidator.equals(
    "task belongs to correct project",
    task.project.id,
    project.id,
  );
  TestValidator.equals("task deleted_at is null", task.deleted_at, null);
  TestValidator.predicate(
    "task has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      task.id,
    ),
  );
  TestValidator.predicate(
    "created_by_member exists",
    task.createdByMember.id !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(task.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(task.updated_at),
  );
}
