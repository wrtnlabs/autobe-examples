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
 * Test that an admin can retrieve a specific task snapshot by its unique identifier.
 * This test verifies admin authentication, snapshot existence, response completeness,
 * and organization isolation for task snapshot retrieval operations.
 */
export async function test_api_task_snapshot_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Member authentication (needed for project creation)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      href: "https://test.com/member/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformMember.ILogin,
  });
  // 3. Create a project using member connection
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Test Project for Snapshot",
        description: "Project used for testing task snapshots",
        status: "active",
        color_code: "#FF5733",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 4. Create a task within the project using admin connection
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: "Test Task for Snapshot",
        description: "This task will be snapshotted for testing",
        status: "open",
        priority: "high",
        due_date: new Date(Date.now() + 86400000 * 7).toISOString(),
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task);
  // 5. Create a task snapshot using admin connection
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
  // 6. Retrieve the task snapshot using admin connection
  const retrievedSnapshot =
    await api.functional.hrmPlatform.admin.task_snapshots.at(adminConnection, {
      snapshotId: snapshot.id,
    });
  typia.assert(retrievedSnapshot);
  // 7. Validate snapshot response contains all required fields
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  // Task state fields
  TestValidator.equals("title matches", retrievedSnapshot.title, task.title);
  TestValidator.equals(
    "description matches",
    retrievedSnapshot.description,
    task.description,
  );
  TestValidator.equals("status matches", retrievedSnapshot.status, task.status);
  TestValidator.equals(
    "priority matches",
    retrievedSnapshot.priority,
    task.priority,
  );
  TestValidator.equals(
    "due_date matches",
    retrievedSnapshot.due_date,
    task.due_date,
  );
  TestValidator.equals(
    "estimated_hours matches",
    retrievedSnapshot.estimated_hours,
    task.estimated_hours,
  );
  // Temporal fields
  TestValidator.equals(
    "task_created_at matches",
    retrievedSnapshot.task_created_at,
    task.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedSnapshot.updated_at,
    task.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedSnapshot.deleted_at,
    task.deleted_at,
  );
  TestValidator.predicate(
    "snapshot_created_at exists",
    retrievedSnapshot.snapshot_created_at !== null,
  );
  // Denormalized relations
  TestValidator.equals(
    "project ID matches",
    retrievedSnapshot.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedSnapshot.project.name,
    project.name,
  );
  // Verify snapshot immutability - snapshot_created_at should be after task creation
  const snapshotTime = new Date(
    retrievedSnapshot.snapshot_created_at,
  ).getTime();
  const taskTime = new Date(retrievedSnapshot.task_created_at).getTime();
  TestValidator.predicate(
    "snapshot created after task",
    snapshotTime >= taskTime,
  );
}
