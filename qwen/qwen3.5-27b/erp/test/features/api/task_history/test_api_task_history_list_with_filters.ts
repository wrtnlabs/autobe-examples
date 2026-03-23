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
import type { IHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTaskHistory";
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

export async function test_api_task_history_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@hrmplatform.test",
      password: "AdminPass123!",
      href: "https://hrmplatform.test/admin/login",
      referrer: "https://hrmplatform.test/dashboard",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project for task testing
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Task History Test Project",
        description: "Project for testing task history functionality",
        status: "active",
        color_code: "#3498db",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project);
  // 3. Create a task that will have status changes
  const task = await generate_random_hrm_platform_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Task for History Testing",
        description: "This task will be used to generate history entries",
        status: "open",
        priority: "medium",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        estimated_hours: 8,
      },
    },
  );
  typia.assert(task);
  // 4. Update task status multiple times to generate history
  const firstUpdate = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  const secondUpdate = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  const thirdUpdate = await api.functional.hrmPlatform.admin.tasks.update(
    adminConnection,
    {
      taskId: task.id,
      body: {
        status: "closed",
      } satisfies IHrmPlatformTask.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  // 5. Test retrieving all history for the task
  const allHistory =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: task.id,
          page: 1,
          limit: 20,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(allHistory);
  // Validate that we have 3 history entries (open->in-progress, in-progress->completed, completed->closed)
  TestValidator.equals(
    "history count matches status changes",
    allHistory.data.length,
    3,
  );
  // Validate pagination info
  TestValidator.equals(
    "pagination current page",
    allHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", allHistory.pagination.limit, 20);
  TestValidator.equals("pagination records", allHistory.pagination.records, 3);
  TestValidator.equals("pagination pages", allHistory.pagination.pages, 1);
  // 6. Validate history entries are sorted by created_at descending (newest first)
  TestValidator.predicate("history sorted by created_at descending", () => {
    for (let i = 1; i < allHistory.data.length; i++) {
      const prev = new Date(allHistory.data[i - 1].created_at).getTime();
      const curr = new Date(allHistory.data[i].created_at).getTime();
      if (prev < curr) return false;
    }
    return true;
  });
  // 7. Validate each history entry has correct structure
  for (const history of allHistory.data) {
    // Task reference
    TestValidator.equals("history task id matches", history.task.id, task.id);
    TestValidator.equals(
      "history task title matches",
      history.task.title,
      "Task for History Testing",
    );
    // Member reference (should be admin)
    TestValidator.equals(
      "history member email is admin",
      history.member.email,
      "admin@hrmplatform.test",
    );
    // Status values should be valid
    TestValidator.predicate("old status is valid", () =>
      ["open", "in-progress", "completed", "closed"].includes(
        history.old_status,
      ),
    );
    TestValidator.predicate("new status is valid", () =>
      ["open", "in-progress", "completed", "closed"].includes(
        history.new_status,
      ),
    );
    // Old and new status should be different
    TestValidator.notEquals(
      "old and new status differ",
      history.old_status,
      history.new_status,
    );
  }
  // 8. Test filtering by old_status
  const openToInProgress =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: task.id,
          oldStatus: "open",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(openToInProgress);
  TestValidator.equals(
    "filter by old_status=open returns 1 entry",
    openToInProgress.data.length,
    1,
  );
  TestValidator.equals(
    "filtered entry old_status is open",
    openToInProgress.data[0].old_status,
    "open",
  );
  TestValidator.equals(
    "filtered entry new_status is in-progress",
    openToInProgress.data[0].new_status,
    "in-progress",
  );
  // 9. Test filtering by new_status
  const toCompleted =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: task.id,
          newStatus: "completed",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(toCompleted);
  TestValidator.equals(
    "filter by new_status=completed returns 1 entry",
    toCompleted.data.length,
    1,
  );
  TestValidator.equals(
    "filtered entry old_status is in-progress",
    toCompleted.data[0].old_status,
    "in-progress",
  );
  TestValidator.equals(
    "filtered entry new_status is completed",
    toCompleted.data[0].new_status,
    "completed",
  );
  // 10. Test filtering by date range
  const now = new Date().toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeHistory =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: task.id,
          dateRange: {
            from: oneWeekAgo,
            to: now,
          },
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(dateRangeHistory);
  TestValidator.equals(
    "filter by date range returns all 3 entries",
    dateRangeHistory.data.length,
    3,
  );
  // 11. Test pagination with limit
  const paginatedHistory =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: task.id,
          page: 1,
          limit: 2,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(paginatedHistory);
  TestValidator.equals(
    "pagination limit=2 returns 2 entries",
    paginatedHistory.data.length,
    2,
  );
  TestValidator.equals(
    "pagination shows 2 records on page 1",
    paginatedHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination total records is 3",
    paginatedHistory.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages is 2",
    paginatedHistory.pagination.pages,
    2,
  );
  // 12. Test page 2
  const page2History =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: task.id,
          page: 2,
          limit: 2,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(page2History);
  TestValidator.equals("page 2 returns 1 entry", page2History.data.length, 1);
  TestValidator.equals(
    "page 2 pagination current is 2",
    page2History.pagination.current,
    2,
  );
  // 13. Test filtering by member ID (admin's member ID)
  const memberHistory =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          memberId: openToInProgress.data[0].member.id,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(memberHistory);
  TestValidator.predicate(
    "filter by member ID returns entries created by admin",
    () =>
      memberHistory.data.every(
        (h) => h.member.id === openToInProgress.data[0].member.id,
      ),
  );
  // 14. Test combined filters (oldStatus + newStatus)
  const combinedFilter =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          oldStatus: "in-progress",
          newStatus: "completed",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter old=in-progress AND new=completed returns 1 entry",
    combinedFilter.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter entry old_status",
    combinedFilter.data[0].old_status,
    "in-progress",
  );
  TestValidator.equals(
    "combined filter entry new_status",
    combinedFilter.data[0].new_status,
    "completed",
  );
  // 15. Test empty result with non-existent filter
  const emptyFilter =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          oldStatus: "nonexistent-status",
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "filter with non-existent status returns empty array",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter pagination records is 0",
    emptyFilter.pagination.records,
    0,
  );
}
