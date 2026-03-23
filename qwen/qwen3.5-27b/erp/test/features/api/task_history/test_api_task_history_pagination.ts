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

/**
 * Test task history pagination functionality.
 * Verifies that task history retrieval supports proper pagination for large datasets.
 * Tests various page sizes, pagination metadata, edge cases, and filtering capabilities.
 */
export async function test_api_task_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://hrm.example.com/admin/login",
      referrer: "https://hrm.example.com",
    } satisfies IHrmPlatformAdmin.ILogin,
  });
  // 2. Create a project for task testing
  const project = await generate_random_hrm_platform_member_projects_create(
    adminConnection,
    {
      body: {
        name: "Pagination Test Project",
        description: "Project for testing task history pagination",
        status: "active",
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Create multiple tasks (30 tasks to ensure enough data for pagination)
  const tasks: IHrmPlatformTask[] = [];
  for (let i = 0; i < 30; i++) {
    const task = await generate_random_hrm_platform_admin_projects_tasks_create(
      adminConnection,
      {
        body: {
          title: `Task ${i + 1} for pagination test`,
          description: `This is task number ${i + 1}`,
          status: "open",
          priority: "medium",
        },
        params: {
          projectId: project.id,
        },
      },
    );
    typia.assert(task);
    tasks.push(task);
  }
  // 4. Update task statuses to generate history entries
  // Each status change creates a history record
  const statusSequence: IHrmPlatformTask.IUpdate["status"][] = [
    "open",
    "in-progress",
    "completed",
    "closed",
  ];
  // Update each task multiple times to create multiple history entries
  for (const task of tasks) {
    // Update status 3 times per task (creating 3 history entries per task)
    for (let j = 1; j < statusSequence.length; j++) {
      const updatedTask = await api.functional.hrmPlatform.admin.tasks.update(
        adminConnection,
        {
          taskId: task.id,
          body: {
            status: statusSequence[j],
          } satisfies IHrmPlatformTask.IUpdate,
        },
      );
      typia.assert(updatedTask);
    }
  }
  // 5. Test default pagination (limit = 20, page = 1)
  const defaultPageResult =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {} satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(defaultPageResult);
  TestValidator.equals(
    "default limit is 20",
    defaultPageResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page is 1",
    defaultPageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "has history records",
    defaultPageResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "data array length matches limit or records",
    defaultPageResult.data.length ===
      Math.min(
        defaultPageResult.pagination.limit,
        defaultPageResult.pagination.records,
      ),
  );
  // 6. Test custom page sizes
  // Test with limit = 5
  const smallPageResult =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(smallPageResult);
  TestValidator.equals(
    "custom limit 5 applied",
    smallPageResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "first page with limit 5",
    smallPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "data length matches limit 5",
    smallPageResult.data.length,
    5,
  );
  // Test with limit = 10
  const mediumPageResult =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(mediumPageResult);
  TestValidator.equals(
    "custom limit 10 applied",
    mediumPageResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "data length matches limit 10",
    mediumPageResult.data.length,
    10,
  );
  // 7. Test pagination across multiple pages
  const totalPages = smallPageResult.pagination.pages;
  TestValidator.predicate("has multiple pages", totalPages > 1);
  // Test first page
  const firstPage = await api.functional.hrmPlatform.admin.task_histories.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: 1,
      } satisfies IHrmPlatformTaskHistory.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current is 1",
    firstPage.pagination.current,
    1,
  );
  // Test middle page (if exists)
  if (totalPages >= 3) {
    const middlePage =
      await api.functional.hrmPlatform.admin.task_histories.index(
        adminConnection,
        {
          body: {
            limit: 5,
            page: Math.floor(totalPages / 2),
          } satisfies IHrmPlatformTaskHistory.IRequest,
        },
      );
    typia.assert(middlePage);
    TestValidator.equals(
      "middle page current matches requested",
      middlePage.pagination.current,
      Math.floor(totalPages / 2),
    );
    TestValidator.predicate("middle page has data", middlePage.data.length > 0);
  }
  // Test last page
  const lastPage = await api.functional.hrmPlatform.admin.task_histories.index(
    adminConnection,
    {
      body: {
        limit: 5,
        page: totalPages,
      } satisfies IHrmPlatformTaskHistory.IRequest,
    },
  );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page current matches total pages",
    lastPage.pagination.current,
    totalPages,
  );
  TestValidator.predicate("last page has data", lastPage.data.length > 0);
  TestValidator.predicate(
    "last page data length less than or equal to limit",
    lastPage.data.length <= 5,
  );
  // Test page beyond total pages (should return empty or handle gracefully)
  const beyondPage =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          limit: 5,
          page: totalPages + 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page has no data",
    beyondPage.data.length === 0,
  );
  // 8. Test pagination with filters
  // Filter by specific taskId
  const filteredByTask =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          taskId: tasks[0].id,
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByTask);
  TestValidator.predicate(
    "filtered results only contain specified task",
    filteredByTask.data.every((history) => history.task.id === tasks[0].id),
  );
  TestValidator.predicate(
    "filtered results have history entries",
    filteredByTask.data.length > 0,
  );
  // Filter by oldStatus
  const filteredByOldStatus =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          oldStatus: "open",
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByOldStatus);
  TestValidator.predicate(
    "filtered by old status contains correct transitions",
    filteredByOldStatus.data.every((history) => history.old_status === "open"),
  );
  // Filter by newStatus
  const filteredByNewStatus =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          newStatus: "completed",
          limit: 10,
          page: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByNewStatus);
  TestValidator.predicate(
    "filtered by new status contains correct transitions",
    filteredByNewStatus.data.every(
      (history) => history.new_status === "completed",
    ),
  );
  // 9. Verify pagination metadata consistency
  TestValidator.equals(
    "total pages calculation correct",
    smallPageResult.pagination.pages,
    Math.ceil(
      smallPageResult.pagination.records / smallPageResult.pagination.limit,
    ),
  );
  TestValidator.predicate(
    "records count is positive",
    smallPageResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    smallPageResult.pagination.limit >= 1 &&
      smallPageResult.pagination.limit <= 100,
  );
  // 10. Test maximum limit (100)
  const maxLimitResult =
    await api.functional.hrmPlatform.admin.task_histories.index(
      adminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IHrmPlatformTaskHistory.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.equals(
    "maximum limit 100 applied",
    maxLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit returns all records",
    maxLimitResult.data.length === maxLimitResult.pagination.records,
  );
}
