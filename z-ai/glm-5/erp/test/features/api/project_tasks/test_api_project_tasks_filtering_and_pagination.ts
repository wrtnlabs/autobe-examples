import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

/**
 * Test the filtering and pagination capabilities of the task list endpoint.
 * This validates that users can effectively search and navigate through task
 * lists using various filter combinations.
 */
export async function test_api_project_tasks_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via join (establishes organization with owner permissions)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Test default task list (should be empty or return existing tasks)
  const initialTasks = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {},
    },
  );
  typia.assert(initialTasks);
  // 4. Test pagination parameters
  // Test with specific page and limit
  const paginatedTasks =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(paginatedTasks);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is at least 1",
    () => paginatedTasks.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within valid range",
    () =>
      paginatedTasks.pagination.limit >= 1 &&
      paginatedTasks.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    () => paginatedTasks.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => paginatedTasks.pagination.pages >= 0,
  );
  // 5. Test pagination with limit boundary
  const minLimitTasks = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 1,
      },
    },
  );
  typia.assert(minLimitTasks);
  TestValidator.equals("limit 1 response", minLimitTasks.pagination.limit, 1);
  // 6. Test page beyond available data
  const beyondPageTasks =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        page: 999,
        limit: 10,
      },
    });
  typia.assert(beyondPageTasks);
  TestValidator.equals(
    "page beyond total returns empty data",
    beyondPageTasks.data.length,
    0,
  );
  // 7. Test filtering by status
  const statuses = ["open", "in-progress", "completed", "closed"] as const;
  for (const status of statuses) {
    const statusFilteredTasks =
      await api.functional.erpHrm.member.projects.tasks.index(
        memberConnection,
        {
          projectId: project.id,
          body: {
            status,
          },
        },
      );
    typia.assert(statusFilteredTasks);
    // Validate all returned tasks have the specified status
    for (const task of statusFilteredTasks.data) {
      TestValidator.equals("task status matches filter", task.status, status);
    }
  }
  // 8. Test filtering by priority
  const priorities = ["low", "medium", "high", "urgent"] as const;
  for (const priority of priorities) {
    const priorityFilteredTasks =
      await api.functional.erpHrm.member.projects.tasks.index(
        memberConnection,
        {
          projectId: project.id,
          body: {
            priority,
          },
        },
      );
    typia.assert(priorityFilteredTasks);
    // Validate all returned tasks have the specified priority
    for (const task of priorityFilteredTasks.data) {
      TestValidator.equals(
        "task priority matches filter",
        task.priority,
        priority,
      );
    }
  }
  // 9. Test filtering by employeeId (unassigned tasks)
  const unassignedTasks =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        employeeId: null,
      },
    });
  typia.assert(unassignedTasks);
  // Validate all returned tasks are unassigned
  for (const task of unassignedTasks.data) {
    TestValidator.equals("task is unassigned", task.employee, null);
  }
  // 10. Test search filter with partial text matching
  const searchTasks = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        search: "test",
      },
    },
  );
  typia.assert(searchTasks);
  // 11. Test combined filters (status AND priority)
  const combinedFilterTasks =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {
        status: "open",
        priority: "high",
      },
    });
  typia.assert(combinedFilterTasks);
  // Validate all returned tasks have both the specified status AND priority
  for (const task of combinedFilterTasks.data) {
    TestValidator.equals("task status is open", task.status, "open");
    TestValidator.equals("task priority is high", task.priority, "high");
  }
  // 12. Test maximum limit boundary
  const maxLimitTasks = await api.functional.erpHrm.member.projects.tasks.index(
    memberConnection,
    {
      projectId: project.id,
      body: {
        limit: 100,
      },
    },
  );
  typia.assert(maxLimitTasks);
  TestValidator.equals("max limit is 100", maxLimitTasks.pagination.limit, 100);
  // 13. Test default pagination behavior (no pagination params)
  const defaultPaginationTasks =
    await api.functional.erpHrm.member.projects.tasks.index(memberConnection, {
      projectId: project.id,
      body: {},
    });
  typia.assert(defaultPaginationTasks);
  // Default page should be 1
  TestValidator.equals(
    "default page is 1",
    defaultPaginationTasks.pagination.current,
    1,
  );
}
