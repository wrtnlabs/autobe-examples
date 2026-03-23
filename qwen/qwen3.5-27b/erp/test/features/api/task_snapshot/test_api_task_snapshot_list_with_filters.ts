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

export async function test_api_task_snapshot_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@hrmplatform.test",
      password: "admin1234",
      href: "https://hrmplatform.test/admin/login",
      referrer: "https://hrmplatform.test/admin",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project for task context
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Test Project for Snapshots",
        description: "Project used for testing task snapshot filtering",
        status: "active",
        color_code: "#3498db",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Create multiple tasks to generate snapshots
  const task1 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "High Priority Task",
        description: "This is a high priority task for testing",
        status: "in-progress",
        priority: "high",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task1);
  const task2 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Low Priority Task",
        description: "This is a low priority task for testing",
        status: "open",
        priority: "low",
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 4,
      },
    },
  );
  typia.assert(task2);
  const task3 = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Urgent Task",
        description: "This is an urgent task for testing",
        status: "completed",
        priority: "urgent",
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 2,
      },
    },
  );
  typia.assert(task3);
  // 4. Test listing all snapshots with pagination
  const allSnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "snapshot_created_at",
          order: "desc",
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "pagination current page",
    allSnapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allSnapshots.pagination.limit, 10);
  TestValidator.predicate("has snapshots", allSnapshots.pagination.records > 0);
  // 5. Test filtering by project_id
  const projectSnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          project_id: project.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(projectSnapshots);
  TestValidator.predicate(
    "all snapshots belong to project",
    projectSnapshots.data.every(
      (snapshot) => snapshot.project.id === project.id,
    ),
  );
  // 6. Test filtering by task_id
  const task1Snapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          task_id: task1.id,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(task1Snapshots);
  TestValidator.predicate(
    "has task1 snapshots",
    task1Snapshots.pagination.records > 0,
  );
  TestValidator.equals(
    "first snapshot title matches",
    task1Snapshots.data[0].title,
    task1.title,
  );
  // 7. Test filtering by status
  const inProgressSnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          status: "in-progress",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(inProgressSnapshots);
  TestValidator.predicate(
    "all snapshots have in-progress status",
    inProgressSnapshots.data.every(
      (snapshot) => snapshot.status === "in-progress",
    ),
  );
  // 8. Test filtering by priority
  const highPrioritySnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          priority: "high",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(highPrioritySnapshots);
  TestValidator.predicate(
    "all snapshots have high priority",
    highPrioritySnapshots.data.every(
      (snapshot) => snapshot.priority === "high",
    ),
  );
  // 9. Test date range filtering
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();
  const recentSnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          snapshot_date_from: oneWeekAgo,
          snapshot_date_to: now,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(recentSnapshots);
  TestValidator.predicate(
    "recent snapshots within date range",
    recentSnapshots.data.every(
      (snapshot) =>
        snapshot.snapshot_created_at >= oneWeekAgo &&
        snapshot.snapshot_created_at <= now,
    ),
  );
  // 10. Test combined filters
  const combinedFilterSnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          project_id: project.id,
          status: "completed",
          priority: "urgent",
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterSnapshots);
  TestValidator.predicate(
    "combined filters applied correctly",
    combinedFilterSnapshots.data.every(
      (snapshot) =>
        snapshot.project.id === project.id &&
        snapshot.status === "completed" &&
        snapshot.priority === "urgent",
    ),
  );
  // 11. Verify sorting order (newest first)
  if (allSnapshots.data.length > 1) {
    TestValidator.predicate(
      "snapshots sorted by snapshot_created_at descending",
      allSnapshots.data.every(
        (snapshot, index, array) =>
          index === 0 ||
          snapshot.snapshot_created_at <= array[index - 1].snapshot_created_at,
      ),
    );
  }
  // 12. Verify snapshot data completeness
  if (allSnapshots.data.length > 0) {
    const firstSnapshot = allSnapshots.data[0];
    TestValidator.predicate(
      "snapshot has title",
      firstSnapshot.title !== null && firstSnapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot has status",
      firstSnapshot.status !== null && firstSnapshot.status.length > 0,
    );
    TestValidator.predicate(
      "snapshot has priority",
      firstSnapshot.priority !== null && firstSnapshot.priority.length > 0,
    );
    TestValidator.predicate(
      "snapshot has project reference",
      firstSnapshot.project !== null,
    );
    TestValidator.predicate(
      "snapshot has snapshot_created_at",
      firstSnapshot.snapshot_created_at !== null,
    );
  }
  // 13. Test pagination with limit
  const paginatedSnapshots =
    await api.functional.hrmPlatform.admin.task_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IHrmPlatformTaskSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSnapshots.data.length,
    Math.min(2, paginatedSnapshots.pagination.records),
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginatedSnapshots.pagination.limit,
    2,
  );
}
