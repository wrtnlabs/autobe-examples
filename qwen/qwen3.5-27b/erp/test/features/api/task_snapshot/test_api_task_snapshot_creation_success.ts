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
import type { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
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
import { generate_random_hrm_platform_admin_task_snapshots_create } from "../../../generate/generate_random_hrm_platform_admin_task_snapshots_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_task_snapshot } from "../../../prepare/prepare_random_hrm_platform_task_snapshot";

export async function test_api_task_snapshot_creation_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test admin task snapshot creation workflow.
   * 1. Admin authenticates to the system
   * 2. Admin creates a project for task management
   * 3. Admin creates a task with complete attributes
   * 4. Admin creates a snapshot of the task
   * 5. Validate snapshot contains all task state fields and denormalized references
   */
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@hrmplatform.test",
      password: "admin1234",
      href: "https://hrmplatform.test/admin/login",
      referrer: "https://hrmplatform.test/dashboard",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Task Snapshot Test Project",
        description: "Project for testing task snapshot creation functionality",
        status: "active",
        color_code: "#3498db",
        budget_hours: 160,
      },
    },
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Implement User Authentication Module",
        description:
          "Create login, registration, and password reset functionality with JWT tokens",
        status: "in-progress",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 40,
      },
    },
  );
  typia.assert(task);
  // 4. Create a snapshot of the task
  const snapshot =
    await generate_random_hrm_platform_admin_task_snapshots_create(
      adminConnection,
      {
        body: {
          hrm_platform_task_id: task.id,
        },
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot contains all expected fields
  TestValidator.equals(
    "snapshot ID is valid UUID",
    typeof snapshot.id,
    "string",
  );
  TestValidator.predicate(
    "snapshot ID matches UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      snapshot.id,
    ),
  );
  // Validate task state fields are captured
  TestValidator.equals("title matches task", snapshot.title, task.title);
  TestValidator.equals(
    "description matches task",
    snapshot.description,
    task.description,
  );
  TestValidator.equals("status matches task", snapshot.status, task.status);
  TestValidator.equals(
    "priority matches task",
    snapshot.priority,
    task.priority,
  );
  TestValidator.equals(
    "due_date matches task",
    snapshot.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "estimated_hours matches task",
    snapshot.estimated_hours,
    task.estimated_hours,
  );
  // Validate temporal fields
  TestValidator.equals(
    "task_created_at matches original",
    snapshot.task_created_at,
    task.created_at,
  );
  TestValidator.equals(
    "updated_at matches task",
    snapshot.updated_at,
    task.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches task",
    snapshot.deleted_at,
    task.deleted_at,
  );
  // Validate snapshot_created_at is set
  TestValidator.predicate("snapshot_created_at is valid datetime", () => {
    const snapshotTime = new Date(snapshot.snapshot_created_at);
    return !isNaN(snapshotTime.getTime()) && snapshotTime.getTime() > 0;
  });
  // Validate denormalized project reference
  TestValidator.equals("project ID matches", snapshot.project.id, project.id);
  TestValidator.equals(
    "project name matches",
    snapshot.project.name,
    project.name,
  );
  TestValidator.equals(
    "project status matches",
    snapshot.project.status,
    project.status,
  );
  // Validate employee reference (null in this case as task was unassigned)
  TestValidator.equals(
    "employee is null for unassigned task",
    snapshot.employee,
    null,
  );
  // Validate parent task reference (null as this is not a subtask)
  TestValidator.equals(
    "parentTask is null for top-level task",
    snapshot.parentTask,
    null,
  );
}
