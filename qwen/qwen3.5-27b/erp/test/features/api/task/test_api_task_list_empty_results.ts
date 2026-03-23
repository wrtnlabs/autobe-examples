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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that the task list endpoint handles empty result scenarios gracefully.
 *
 * This test verifies that when no tasks match the filter criteria, the API
 * returns a valid paginated response with empty data array and correct
 * pagination metadata, rather than throwing errors or returning invalid data.
 */
export async function test_api_task_list_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Test with status filter that matches no tasks
  const statusFilterResult = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {
        status: "completed",
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(statusFilterResult);
  TestValidator.equals(
    "status filter - data is empty",
    statusFilterResult.data,
    [],
  );
  TestValidator.equals(
    "status filter - records is 0",
    statusFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "status filter - pages is 0",
    statusFilterResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "status filter - current page",
    statusFilterResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "status filter - limit",
    statusFilterResult.pagination.limit,
    20,
  );
  // 3. Test with assigned_employee_id that has no tasks
  const nonExistentEmployeeId = typia.random<string & tags.Format<"uuid">>();
  const employeeFilterResult =
    await api.functional.hrmPlatform.admin.tasks.index(adminConnection, {
      body: {
        assigned_employee_id: nonExistentEmployeeId,
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformTask.IRequest,
    });
  typia.assert(employeeFilterResult);
  TestValidator.equals(
    "employee filter - data is empty",
    employeeFilterResult.data,
    [],
  );
  TestValidator.equals(
    "employee filter - records is 0",
    employeeFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "employee filter - pages is 0",
    employeeFilterResult.pagination.pages,
    0,
  );
  // 4. Test with search query that matches no tasks
  const uniqueSearchQuery = `unique_search_${typia.random<string & tags.Format<"uuid">>()}`;
  const searchFilterResult = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {
        search: uniqueSearchQuery,
        page: 1,
        page_size: 20,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(searchFilterResult);
  TestValidator.equals(
    "search filter - data is empty",
    searchFilterResult.data,
    [],
  );
  TestValidator.equals(
    "search filter - records is 0",
    searchFilterResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "search filter - pages is 0",
    searchFilterResult.pagination.pages,
    0,
  );
  // 5. Test with page number beyond available results
  const beyondPageResult = await api.functional.hrmPlatform.admin.tasks.index(
    adminConnection,
    {
      body: {
        page: 10,
        page_size: 20,
      } satisfies IHrmPlatformTask.IRequest,
    },
  );
  typia.assert(beyondPageResult);
  TestValidator.equals(
    "beyond page - data is empty",
    beyondPageResult.data,
    [],
  );
  TestValidator.equals(
    "beyond page - records is 0",
    beyondPageResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "beyond page - pages is 0",
    beyondPageResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "beyond page - current page",
    beyondPageResult.pagination.current,
    10,
  );
  TestValidator.equals(
    "beyond page - limit",
    beyondPageResult.pagination.limit,
    20,
  );
}
