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

export async function test_api_task_partial_update_estimated_hours_and_due_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  typia.assert(project);
  // 3. Create task
  const task = await generate_random_erp_hrm_admin_projects_tasks_create(
    adminConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // Store original values for comparison
  const originalTitle = task.title;
  const originalStatus = task.status;
  const originalPriority = task.priority;
  // 4. Update task with estimated_hours and due_date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateString = futureDate.toISOString();
  const updatedTask = await api.functional.erpHrm.admin.projects.tasks.update(
    adminConnection,
    {
      projectId: project.id,
      taskId: task.id,
      body: {
        estimated_hours: 40,
        due_date: futureDateString,
      } satisfies IErpHrmTask.IUpdate,
    },
  );
  typia.assert(updatedTask);
  // 5. Validations
  TestValidator.equals(
    "estimated_hours updated to 40",
    updatedTask.estimated_hours,
    40,
  );
  TestValidator.equals(
    "due_date matches future date",
    updatedTask.due_date,
    futureDateString,
  );
  TestValidator.equals(
    "title remains unchanged",
    updatedTask.title,
    originalTitle,
  );
  TestValidator.equals(
    "status remains unchanged",
    updatedTask.status,
    originalStatus,
  );
  TestValidator.equals(
    "priority remains unchanged",
    updatedTask.priority,
    originalPriority,
  );
}
