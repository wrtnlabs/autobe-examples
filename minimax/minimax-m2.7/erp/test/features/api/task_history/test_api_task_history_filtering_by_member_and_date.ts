import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_history_filtering_by_member_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access task history endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Generate random IDs for project and task
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test filtering by erpHrmMemberId only
  const memberIdFilter = admin.id;
  const memberFilteredResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          erpHrmMemberId: memberIdFilter,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(memberFilteredResponse);
  // Validate response structure with member filter
  TestValidator.equals(
    "pagination exists",
    memberFilteredResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "data is array",
    Array.isArray(memberFilteredResponse.data),
  );
  // If there are history entries, verify they all match the member filter
  if (memberFilteredResponse.data.length > 0) {
    for (const history of memberFilteredResponse.data) {
      TestValidator.equals(
        "history member id matches filter",
        history.member.id,
        memberIdFilter,
      );
    }
  }
  // 3. Test filtering by createdAtFrom only
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const dateFromResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          createdAtFrom: fromDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(dateFromResponse);
  // Validate all returned histories have createdAt >= fromDate
  for (const history of dateFromResponse.data) {
    TestValidator.predicate(
      "history createdAt >= createdAtFrom filter",
      new Date(history.createdAt) >= fromDate,
    );
  }
  // 4. Test filtering by createdAtTo only
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + 1);
  const dateToResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          createdAtTo: toDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(dateToResponse);
  // Validate all returned histories have createdAt <= toDate
  for (const history of dateToResponse.data) {
    TestValidator.predicate(
      "history createdAt <= createdAtTo filter",
      new Date(history.createdAt) <= toDate,
    );
  }
  // 5. Test combined filtering - erpHrmMemberId + date range
  const combinedResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          erpHrmMemberId: memberIdFilter,
          createdAtFrom: fromDate.toISOString(),
          createdAtTo: toDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined filter - entries should match both criteria
  for (const history of combinedResponse.data) {
    TestValidator.equals(
      "member id matches combined filter",
      history.member.id,
      memberIdFilter,
    );
    TestValidator.predicate(
      "createdAt within combined date range",
      new Date(history.createdAt) >= fromDate &&
        new Date(history.createdAt) <= toDate,
    );
  }
  // 6. Test pagination with filters applied
  const paginatedResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          erpHrmMemberId: memberIdFilter,
          page: 2,
          limit: 5,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 2",
    paginatedResponse.pagination.current,
    2,
  );
  TestValidator.equals("limit is 5", paginatedResponse.pagination.limit, 5);
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 5,
  );
  // 7. Test with all optional filters and maximum limit
  const maxLimitResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {
          erpHrmMemberId: memberIdFilter,
          createdAtFrom: fromDate.toISOString(),
          createdAtTo: toDate.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // Validate max limit constraint
  TestValidator.predicate(
    "data length does not exceed max limit of 100",
    maxLimitResponse.data.length <= 100,
  );
}
