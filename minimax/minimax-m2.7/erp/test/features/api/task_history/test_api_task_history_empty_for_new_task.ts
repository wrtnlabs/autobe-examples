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

export async function test_api_task_history_empty_for_new_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a project
  const project = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
        color: "#FF5733" satisfies string & tags.Format<"regex">,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(project);
  const projectId = project.items[0].projectId;
  // 3. Create a task with no status changes
  const taskResponse = await api.functional.erpHrm.admin.projects.tasks.create(
    adminConnection,
    {
      projectId: projectId,
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<255>>(),
      } satisfies IErpHrmTask.ICreate,
    },
  );
  typia.assert(taskResponse);
  // Generate taskId for history endpoint
  const taskId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve task history for the newly created task
  const historyResponse =
    await api.functional.erpHrm.admin.projects.tasks.histories.index(
      adminConnection,
      {
        projectId: projectId,
        taskId: taskId,
        body: {} satisfies IErpHrmTaskHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 5. Validate that the response returns empty data array with proper pagination
  TestValidator.equals("data is empty array", historyResponse.data, []);
  TestValidator.equals(
    "pagination.records is 0",
    historyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.current is 1",
    historyResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    historyResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination.pages is 0",
    historyResponse.pagination.pages,
    0,
  );
}
