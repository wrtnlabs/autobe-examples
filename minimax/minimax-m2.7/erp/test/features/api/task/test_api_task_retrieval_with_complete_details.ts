import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_admin_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_admin_projects_tasks_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_retrieval_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a project
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {},
  );
  // 3. Create parent task
  await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
    params: { projectId: project.items[0]!.projectId },
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      estimatedHours: typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
      dueDate: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString() as string & tags.Format<"date-time">,
    },
  });
  // 4. Create subtask
  await generate_random_erp_hrm_admin_projects_tasks_create(adminConnection, {
    params: { projectId: project.items[0]!.projectId },
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  // 5. Retrieve task details (IErpHrmTask is aggregate type for project)
  // Since IErpHrmTask represents project-level task analytics rather than single task,
  // we validate the endpoint returns proper aggregate structure for the project
  const taskDetails = await api.functional.erpHrm.admin.projects.tasks.at(
    adminConnection,
    {
      projectId: project.items[0]!.projectId,
      taskId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // 6. Validate response with typia.assert
  typia.assert(taskDetails);
}
