import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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

export async function test_api_task_history_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
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
  // 2. Create a new project
  // Note: IErpHrmProject is a budget report type without id field
  // We use the response to validate the API works
  const projectCreateResult = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#FF5733",
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(projectCreateResult);
  // 3. Create a new task
  // Note: IErpHrmTask is a task analytics type without id field
  // We use the response to validate the API works
  const taskCreateResult =
    await api.functional.erpHrm.admin.projects.tasks.create(adminConnection, {
      projectId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        title: "Initial Task",
      } satisfies IErpHrmTask.ICreate,
    });
  typia.assert(taskCreateResult);
  // 4. Update task status to generate history entry (open -> in-progress)
  // This creates a task history entry that we will retrieve
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: projectId,
      taskId: taskId,
      body: {
        status: "in-progress",
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. Retrieve task history entry
  // Generate historyId as we cannot get it from the update response
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const history = await api.functional.erpHrm.admin.projects.tasks.histories.at(
    adminConnection,
    {
      projectId: projectId,
      taskId: taskId,
      historyId: historyId,
    },
  );
  typia.assert(history);
  // Validations - verify the history entry structure
  TestValidator.equals("history task_id matches", history.task_id, taskId);
  TestValidator.equals(
    "new_status is in-progress",
    history.new_status,
    "in-progress",
  );
  TestValidator.predicate(
    "member has displayName",
    !!history.member?.displayName,
  );
  TestValidator.predicate("member has email", !!history.member?.email);
  TestValidator.predicate("created_at is valid", !!history.created_at);
}
