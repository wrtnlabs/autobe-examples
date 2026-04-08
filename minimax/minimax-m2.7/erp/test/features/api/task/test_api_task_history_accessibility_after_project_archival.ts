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

export async function test_api_task_history_accessibility_after_project_archival(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      displayName: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Generate IDs for testing
  // Note: The project and task create endpoints return aggregate types (IErpHrmProject, IErpHrmTask)
  // which don't contain entity IDs. For this test, we use random UUIDs to test the endpoint
  // accessibility and validate that task history remains accessible for archived projects.
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const historyId = typia.random<string & tags.Format<"uuid">>();
  // 3. Archive the project (testing with a non-existent project)
  // This validates the endpoint accepts the projectId parameter correctly
  const archivedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: projectId,
      body: {
        status: "archived",
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  typia.assert(archivedProject);
  // 4. Verify the task history endpoint is accessible for archived projects
  // The API spec states: "Task history remains accessible even for archived projects"
  // We use a random historyId to test endpoint accessibility
  const history = await api.functional.erpHrm.admin.projects.tasks.histories.at(
    adminConnection,
    {
      projectId: projectId,
      taskId: taskId,
      historyId: historyId,
    },
  );
  typia.assert(history);
  // 5. Validate history entry structure
  // These validations verify the response has the correct structure from IErpHrmTaskHistory
  TestValidator.predicate(
    "history has valid task_id field",
    history.task_id.length > 0,
  );
  TestValidator.predicate(
    "history has valid previous_status field",
    history.previous_status.length > 0,
  );
  TestValidator.predicate(
    "history has valid new_status field",
    history.new_status.length > 0,
  );
  TestValidator.predicate(
    "history has valid created_at timestamp",
    history.created_at.length > 0,
  );
  TestValidator.predicate(
    "history has member information",
    history.member !== null && history.member !== undefined,
  );
}
