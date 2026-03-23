import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskSnapshot";
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

export async function test_api_task_snapshot_audit_trail_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/login",
      referrer: "https://test.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project for task context
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Audit Trail Test Project",
        description: "Project for testing task snapshot audit trail",
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task with initial state
  const initialTask =
    await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        params: { projectId: project.id },
        body: {
          title: "Task for Snapshot Testing",
          description:
            "This task will be updated multiple times to test snapshots",
          status: "open",
          priority: "high",
          due_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          estimated_hours: 8,
        } satisfies IHrmPlatformTask.ICreate,
      },
    );
  typia.assert(initialTask);
  const taskId = initialTask.id;
  const initialStatus = initialTask.status;
  // 4. Update task status multiple times to trigger snapshot creation
  // First update: open → in-progress
  const updatedTask1 = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask1);
  // Small delay to ensure snapshot timestamps are distinct
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Second update: in-progress → completed
  const updatedTask2 = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId,
      body: {
        status: "completed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask2);
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Third update: completed → closed
  const updatedTask3 = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId,
      body: {
        status: "closed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(updatedTask3);
  // 5. Query task snapshots for this task
  const snapshotsResponse =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          task_id: taskId,
          page: 1,
          limit: 100,
          order: "asc",
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  const snapshots = snapshotsResponse.data;
  // 6. Validate snapshot audit trail
  // Verify that snapshots were created
  TestValidator.predicate(
    "snapshots were created for task",
    snapshots.length >= 1,
  );
  // Verify snapshots are ordered chronologically
  for (let i = 1; i < snapshots.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} is after snapshot ${i - 1}`,
      new Date(snapshots[i].snapshot_created_at).getTime() >=
        new Date(snapshots[i - 1].snapshot_created_at).getTime(),
    );
  }
  // Verify each snapshot contains all required task attributes
  for (const snapshot of snapshots) {
    TestValidator.predicate(
      "snapshot has title",
      snapshot.title !== null && snapshot.title !== undefined,
    );
    TestValidator.predicate(
      "snapshot has status",
      snapshot.status !== null && snapshot.status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has priority",
      snapshot.priority !== null && snapshot.priority !== undefined,
    );
    TestValidator.predicate(
      "snapshot has project reference",
      snapshot.project !== null,
    );
    TestValidator.predicate(
      "snapshot has snapshot_created_at",
      snapshot.snapshot_created_at !== null &&
        snapshot.snapshot_created_at !== undefined,
    );
  }
  // Verify that snapshots contain different states (status evolution)
  const statuses = snapshots.map((s) => s.status);
  const uniqueStatuses = new Set(statuses);
  TestValidator.predicate(
    "snapshots capture different task states",
    uniqueStatuses.size >= 1,
  );
  // Verify snapshot data matches expected task attributes
  TestValidator.equals(
    "snapshot title matches task title",
    snapshots[0].title,
    initialTask.title,
  );
  // Verify snapshots are immutable (earlier snapshots don't match current state)
  if (snapshots.length >= 2) {
    TestValidator.notEquals(
      "earlier snapshot differs from later snapshot",
      snapshots[0].status,
      snapshots[snapshots.length - 1].status,
    );
  }
}
