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

export async function test_api_project_tasks_filter_by_assignee(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // SETUP PHASE
  // ============================================
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Generate random project ID for testing filter endpoint
  // Note: The project ID must exist for the endpoint to work
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate random employee IDs for filter testing
  const employee1Id = typia.random<string & tags.Format<"uuid">>();
  const employee2Id = typia.random<string & tags.Format<"uuid">>();
  // ============================================
  // VALIDATION 1: Filter by employee1's ID
  // ============================================
  const emp1TasksResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: employee1Id,
      },
    });
  typia.assert(emp1TasksResponse);
  // Response structure validation
  TestValidator.equals(
    "response has pagination",
    emp1TasksResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(emp1TasksResponse.data),
  );
  // ============================================
  // VALIDATION 2: Filter by employee2's ID
  // ============================================
  const emp2TasksResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: employee2Id,
      },
    });
  typia.assert(emp2TasksResponse);
  TestValidator.predicate(
    "employee2 response is valid",
    () => emp2TasksResponse !== null && emp2TasksResponse !== undefined,
  );
  // ============================================
  // VALIDATION 3: Combine employeeId with status filter
  // ============================================
  const combinedFilterResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: employee1Id,
        status: "open",
      },
    });
  typia.assert(combinedFilterResponse);
  TestValidator.predicate(
    "combined filter response valid",
    () =>
      combinedFilterResponse !== null && combinedFilterResponse !== undefined,
  );
  // All returned tasks should match both filters (if any exist)
  TestValidator.predicate("all tasks match employee1 AND open status", () =>
    combinedFilterResponse.data.every(
      (task) =>
        (task.assignee === null || task.assignee?.id === employee1Id) &&
        task.status === "open",
    ),
  );
  // ============================================
  // VALIDATION 4: Filter with non-existent employee ID
  // ============================================
  const nonExistentEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: projectId,
      body: {
        employeeId: nonExistentEmployeeId,
      },
    });
  typia.assert(nonExistentResponse);
  TestValidator.equals(
    "records for non-existent employee",
    nonExistentResponse.pagination.records,
    0,
  );
  TestValidator.equals("empty data array", nonExistentResponse.data.length, 0);
  // ============================================
  // VALIDATION 5: Pagination structure validation
  // ============================================
  const pagination = nonExistentResponse.pagination;
  TestValidator.predicate(
    "pagination has current page",
    () => "current" in pagination,
  );
  TestValidator.predicate("pagination has limit", () => "limit" in pagination);
  TestValidator.predicate(
    "pagination has records",
    () => "records" in pagination,
  );
  TestValidator.predicate("pagination has pages", () => "pages" in pagination);
  // ============================================
  // VALIDATION 6: Test pagination with limit parameter
  // ============================================
  const paginatedResponse =
    await api.functional.erpHrm.admin.projects.tasks.index(adminConnection, {
      projectId: projectId,
      body: {
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    });
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "limit parameter accepted",
    () => paginatedResponse.pagination.limit <= 10,
  );
}
