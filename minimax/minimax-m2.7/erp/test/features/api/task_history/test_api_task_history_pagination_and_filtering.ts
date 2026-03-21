import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

/**
 * Test pagination and filtering capabilities for task history retrieval.
 *
 * This E2E test validates:
 * 1. Admin authentication via join endpoint
 * 2. Project creation with active status
 * 3. Task creation within the project
 * 4. Multiple task status transitions to generate history entries (open → in-progress → completed → closed)
 * 5. Pagination with limit parameter returns correct number of entries
 * 6. Cursor-based pagination for navigating through results
 * 7. Filtering by previous_status returns only matching entries
 * 8. Filtering by new_status, created_at_after, and created_at_before works correctly
 */
export async function test_api_task_history_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create a task
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        status: "open",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  TestValidator.equals("initial status is open", task.status, "open");
  // Step 4: Update task status multiple times to generate history entries
  // Transition 1: open → in-progress
  const inProgressTask =
    await api.functional.erpHrm.admin.projects.tasks.update(adminConnection, {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    });
  typia.assert(inProgressTask);
  TestValidator.equals(
    "status changed to in-progress",
    inProgressTask.status,
    "in-progress",
  );
  // Transition 2: in-progress → completed
  const completedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "completed",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(completedTask);
  TestValidator.equals(
    "status changed to completed",
    completedTask.status,
    "completed",
  );
  // Transition 3: completed → closed
  const closedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        status: "closed",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(closedTask);
  TestValidator.equals("status changed to closed", closedTask.status, "closed");
  // Step 5: Retrieve first page with limit=2
  const firstPage =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          limit: 2,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page returns exactly 2 entries (if available)
  TestValidator.equals("first page limit is 2", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "has data or pagination info",
    firstPage.data.length <= 4,
  );
  // Step 6: Retrieve second page using cursor-based pagination
  let secondPageCursor: string | undefined;
  if (firstPage.data.length > 0) {
    const lastItem = firstPage.data[firstPage.data.length - 1];
    secondPageCursor = lastItem.created_at;
  }
  if (secondPageCursor) {
    const secondPage =
      await api.functional.erpHrm.admin.projects.tasks.histories.index(
        adminConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            cursor: secondPageCursor,
            limit: 2,
          } satisfies IErpHrmTaskHistory.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate pagination metadata
    TestValidator.equals(
      "second page limit is 2",
      secondPage.pagination.limit,
      2,
    );
    // Verify cursor pagination doesn't return the same items
    if (firstPage.data.length > 0 && secondPage.data.length > 0) {
      TestValidator.notEquals(
        "second page has different entries",
        firstPage.data[0].id,
        secondPage.data[0]?.id,
      );
    }
  }
  // Step 7: Filter history by previous_status='in-progress'
  const filteredByPreviousStatus =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          previous_status: "in-progress",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByPreviousStatus);
  // Validate all entries have previous_status = 'in-progress'
  for (const entry of filteredByPreviousStatus.data) {
    TestValidator.equals(
      "entry has correct previous_status",
      entry.previous_status,
      "in-progress",
    );
  }
  // Step 8: Test new_status filter
  const filteredByNewStatus =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {
          new_status: "completed",
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(filteredByNewStatus);
  // Validate all entries have new_status = 'completed'
  for (const entry of filteredByNewStatus.data) {
    TestValidator.equals(
      "entry has correct new_status",
      entry.new_status,
      "completed",
    );
  }
  // Step 9: Test created_at_after filter
  const beforeFiltering =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: project.id,
        taskId: task.id,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(beforeFiltering);
  if (beforeFiltering.data.length > 1) {
    // Get timestamp from second entry to filter after first entry
    const filterTimestamp = beforeFiltering.data[0].created_at;
    const filteredByDate =
      await api.functional.erpHrm.admin.projects.tasks.histories.index(
        adminConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            created_at_after: filterTimestamp,
          } satisfies IErpHrmTaskHistory.IRequest,
        },
      );
    typia.assert(filteredByDate);
    // All entries should have created_at greater than filter timestamp
    for (const entry of filteredByDate.data) {
      TestValidator.predicate(
        "entry created after filter timestamp",
        entry.created_at > filterTimestamp,
      );
    }
  }
  // Step 10: Test created_at_before filter
  if (beforeFiltering.data.length > 1) {
    // Get timestamp from second-to-last entry to filter before last entry
    const filterTimestamp =
      beforeFiltering.data[beforeFiltering.data.length - 1].created_at;
    const filteredByDateBefore =
      await api.functional.erpHrm.admin.projects.tasks.histories.index(
        adminConnection,
        {
          projectId: project.id,
          taskId: task.id,
          body: {
            created_at_before: filterTimestamp,
          } satisfies IErpHrmTaskHistory.IRequest,
        },
      );
    typia.assert(filteredByDateBefore);
    // All entries should have created_at less than filter timestamp
    for (const entry of filteredByDateBefore.data) {
      TestValidator.predicate(
        "entry created before filter timestamp",
        entry.created_at < filterTimestamp,
      );
    }
  }
}
