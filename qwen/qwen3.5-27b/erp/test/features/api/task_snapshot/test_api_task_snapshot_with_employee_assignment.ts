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

/**
 * Test that task snapshot correctly captures employee assignment information and denormalized employee references.
 * This test verifies that:
 * 1. Admin authenticates successfully
 * 2. A project exists in the organization
 * 3. A task is created within the project with assigned_employee_id referencing an employee
 * 4. The snapshot creation request includes the task ID
 * 5. The response returns a complete IHrmPlatformTaskSnapshot with employee field populated
 * 6. The employee reference includes employee id, employment_type, status, member, department, and role
 * 7. The snapshot preserves the assignment state at the time of snapshot creation
 */
export async function test_api_task_snapshot_with_employee_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project for Snapshot",
        description:
          "Project used for testing task snapshots with employee assignment",
        status: "active",
        color_code: "#FF5733",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Create a task with employee assignment
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for Snapshot",
        description: "Task used for testing snapshot with employee assignment",
        status: "open",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 8,
        assigned_employee_id: typia.random<
          string & typia.tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(task);
  // 4. Create a task snapshot
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
  // 5. Validate snapshot structure matches task
  TestValidator.equals(
    "snapshot has valid UUID format",
    typeof snapshot.id,
    "string",
  );
  TestValidator.equals(
    "snapshot title matches task title",
    snapshot.title,
    task.title,
  );
  TestValidator.equals(
    "snapshot status matches task status",
    snapshot.status,
    task.status,
  );
  TestValidator.equals(
    "snapshot priority matches task priority",
    snapshot.priority,
    task.priority,
  );
  // 6. Validate employee reference in snapshot
  if (task.assignedEmployee !== null) {
    typia.assertGuard(task.assignedEmployee!);
    TestValidator.predicate(
      "snapshot has employee reference when task is assigned",
      snapshot.employee !== null,
    );
    typia.assertGuard(snapshot.employee!);
    // Validate employee ID matches
    TestValidator.equals(
      "snapshot employee ID matches task assigned employee ID",
      snapshot.employee!.id,
      task.assignedEmployee.id,
    );
    // Validate employee employment_type matches
    TestValidator.equals(
      "snapshot employee employment_type matches task assigned employee",
      snapshot.employee!.employment_type,
      task.assignedEmployee.employment_type,
    );
    // Validate employee status matches
    TestValidator.equals(
      "snapshot employee status matches task assigned employee",
      snapshot.employee!.status,
      task.assignedEmployee.status,
    );
    // Validate employee member reference
    TestValidator.predicate(
      "snapshot employee has member reference",
      snapshot.employee!.member !== null,
    );
    typia.assertGuard(snapshot.employee!.member!);
    TestValidator.equals(
      "snapshot employee member ID matches task assigned employee member",
      snapshot.employee!.member!.id,
      task.assignedEmployee.member.id,
    );
    TestValidator.equals(
      "snapshot employee member email matches task assigned employee member",
      snapshot.employee!.member!.email,
      task.assignedEmployee.member.email,
    );
    // Validate employee department reference (can be null)
    if (task.assignedEmployee.department !== null) {
      typia.assertGuard(task.assignedEmployee.department!);
      TestValidator.predicate(
        "snapshot employee has department reference when task employee has department",
        snapshot.employee!.department !== null,
      );
      typia.assertGuard(snapshot.employee!.department!);
      TestValidator.equals(
        "snapshot employee department ID matches task assigned employee department",
        snapshot.employee!.department!.id,
        task.assignedEmployee.department.id,
      );
    }
    // Validate employee role reference
    TestValidator.predicate(
      "snapshot employee has role reference",
      snapshot.employee!.role !== null,
    );
    typia.assertGuard(snapshot.employee!.role!);
    TestValidator.equals(
      "snapshot employee role ID matches task assigned employee role",
      snapshot.employee!.role!.id,
      task.assignedEmployee.role.id,
    );
    TestValidator.equals(
      "snapshot employee role name matches task assigned employee role",
      snapshot.employee!.role!.name,
      task.assignedEmployee.role.name,
    );
  }
  // 7. Validate project reference in snapshot
  TestValidator.equals(
    "snapshot project ID matches task project ID",
    snapshot.project.id,
    task.project.id,
  );
  TestValidator.equals(
    "snapshot project name matches task project name",
    snapshot.project.name,
    task.project.name,
  );
  TestValidator.equals(
    "snapshot project status matches task project status",
    snapshot.project.status,
    task.project.status,
  );
  // 8. Validate temporal fields in snapshot
  TestValidator.equals(
    "snapshot task_created_at matches task created_at",
    snapshot.task_created_at,
    task.created_at,
  );
  TestValidator.equals(
    "snapshot updated_at matches task updated_at",
    snapshot.updated_at,
    task.updated_at,
  );
  TestValidator.predicate(
    "snapshot has snapshot_created_at timestamp",
    snapshot.snapshot_created_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot_created_at is valid ISO date-time format",
    !isNaN(Date.parse(snapshot.snapshot_created_at)),
  );
}
