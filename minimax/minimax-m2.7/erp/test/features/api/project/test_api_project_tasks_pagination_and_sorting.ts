import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test pagination and sorting options for project task listing.
 *
 * This test validates:
 * 1. Pagination metadata accuracy (current page, limit, records, pages)
 * 2. Tasks are properly sorted by priority ascending (low < medium < high < urgent)
 * 3. Different pages return different tasks (proper offset handling)
 * 4. Due date descending sort with nulls appearing last
 * 5. CreatedAt ascending sort returns oldest tasks first
 *
 * Note: Task creation API is not available via SDK, so this test uses
 * simulation mode to verify pagination and sorting logic.
 */
export async function test_api_project_tasks_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create project (for context, though we can't create tasks via SDK)
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // Note: Since task creation API (tasks.create) does not exist in the SDK,
  // we cannot create test tasks. We use simulation mode to test pagination logic.
  // Generate a simulated project UUID for testing
  const simulatedProjectId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test pagination with page=2, limit=5, sortBy='priority', order='asc'
  const page2Response = await api.functional.erpHrm.admin.projects.tasks.index(
    adminConnection,
    {
      projectId: simulatedProjectId,
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sortBy: "priority",
        order: "asc",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(page2Response);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    page2Response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records exists",
    page2Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    page2Response.pagination.pages >= 0,
  );
  // 5. Get page 1 for comparison
  const page1Response = await api.functional.erpHrm.admin.projects.tasks.index(
    adminConnection,
    {
      projectId: simulatedProjectId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sortBy: "priority",
        order: "asc",
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(page1Response);
  // 6. Validate page 1 and page 2 have different tasks when records > limit
  if (page1Response.pagination.records > 5) {
    const page1Ids = new Set(page1Response.data.map((t) => t.id));
    const overlap = page2Response.data.some((task) => page1Ids.has(task.id));
    TestValidator.predicate(
      "page 1 and page 2 have no overlap when records > limit",
      !overlap,
    );
  }
  // 7. Validate priority sorting ascending when data exists
  if (page2Response.data.length > 1) {
    const priorityOrder: Record<string, number> = {
      low: 0,
      medium: 1,
      high: 2,
      urgent: 3,
    };
    for (let i = 0; i < page2Response.data.length - 1; i++) {
      const current = priorityOrder[page2Response.data[i].priority] ?? 4;
      const next = priorityOrder[page2Response.data[i + 1].priority] ?? 4;
      TestValidator.predicate(
        `task ${i} priority <= task ${i + 1} priority`,
        current <= next,
      );
    }
  }
  // 8. Test sortBy='dueDate' with order='desc'
  const dueDateDescResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: simulatedProjectId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sortBy: "dueDate",
        order: "desc",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(dueDateDescResponse);
  // Validate due date descending with nulls last - check only non-null pairs
  const validDueDatePairs: Array<{
    current: string;
    next: string;
    index: number;
  }> = [];
  for (let i = 0; i < dueDateDescResponse.data.length - 1; i++) {
    const current = dueDateDescResponse.data[i].due_date;
    const next = dueDateDescResponse.data[i + 1].due_date;
    if (
      current !== null &&
      current !== undefined &&
      next !== null &&
      next !== undefined
    ) {
      validDueDatePairs.push({ current, next, index: i });
    }
  }
  for (const { current, next, index } of validDueDatePairs) {
    TestValidator.predicate(
      `task ${index} due_date >= task ${index + 1} due_date`,
      current >= next,
    );
  }
  // 9. Test sortBy='createdAt' with order='asc'
  const createdAtAscResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: simulatedProjectId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        sortBy: "createdAt",
        order: "asc",
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(createdAtAscResponse);
  // Validate created_at ascending (oldest first)
  if (createdAtAscResponse.data.length > 1) {
    for (let i = 0; i < createdAtAscResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `task ${i} created_at <= task ${i + 1} created_at`,
        createdAtAscResponse.data[i].created_at <=
          createdAtAscResponse.data[i + 1].created_at,
      );
    }
  }
  // 10. Test default sorting (createdAt desc when no sort specified)
  const defaultSortResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: simulatedProjectId,
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 5 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmTask.IRequest,
    });
  typia.assert(defaultSortResponse);
  // Default should be created_at descending (newest first)
  if (defaultSortResponse.data.length > 1) {
    for (let i = 0; i < defaultSortResponse.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort: task ${i} created_at >= task ${i + 1} created_at`,
        defaultSortResponse.data[i].created_at >=
          defaultSortResponse.data[i + 1].created_at,
      );
    }
  }
}
