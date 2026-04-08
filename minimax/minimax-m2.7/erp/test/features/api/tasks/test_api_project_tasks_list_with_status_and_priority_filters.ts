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

export async function test_api_project_tasks_list_with_status_and_priority_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate and create project
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  // 2. Test task list endpoint with combined status and priority filters
  // Send PATCH request with filters: status='in-progress', priority='high'
  // Include pagination (page=1, limit=10) and sorting (sortBy='createdAt', order='desc')
  // Note: IErpHrmProject is a budget report type, get projectId from items array
  const projectId = project.items[0]?.projectId;
  const response = await api.functional.erpHrm.admin.projects.tasks.index(
    adminConnection,
    {
      projectId: projectId!,
      body: {
        status: "in-progress",
        priority: "high",
        sortBy: "createdAt",
        order: "desc",
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IErpHrmTask.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response structure - paginated task list
  TestValidator.equals(
    "pagination object exists",
    response.pagination !== null,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    response.pagination.current,
    1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "limit is 10",
    response.pagination.limit,
    10 as number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists and is properly typed
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. If tasks exist, validate each task summary structure
  for (const task of response.data) {
    // Validate required fields exist
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(task.id),
    );
    TestValidator.predicate("title exists", task.title.length > 0);
    TestValidator.equals(
      "status field exists",
      typeof task.status === "string",
      true,
    );
    TestValidator.equals(
      "priority field exists",
      typeof task.priority === "string",
      true,
    );
    // Validate due_date format (datetime or null)
    // due_date is (string & Format<"date-time">) | null | undefined
    TestValidator.predicate(
      "due_date is valid datetime or null",
      task.due_date === null ||
        task.due_date === undefined ||
        /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(task.due_date),
    );
    // Validate created_at format
    TestValidator.predicate(
      "created_at is valid datetime",
      /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}/.test(task.created_at),
    );
    // Validate filter criteria are respected
    TestValidator.equals("status matches filter", task.status, "in-progress");
    TestValidator.equals("priority matches filter", task.priority, "high");
  }
  // 6. Validate sorting (descending by createdAt)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentTime = new Date(response.data[i].created_at).getTime();
      const nextTime = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "tasks sorted by created_at descending",
        currentTime >= nextTime,
      );
    }
  }
  // 7. Validate pagination limits
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= 10,
  );
  TestValidator.equals(
    "records count is consistent",
    response.pagination.records >= response.data.length,
    true,
  );
}
