import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";

export async function test_api_task_retrieval_by_non_member_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member1 to create project and task
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // Step 2: Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    member1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: "#3A7AFE",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // Step 3: Create task
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    member1Connection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // Step 4: Authenticate as member2 who has no project access
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // Step 5: Attempt to retrieve task as non-member - expect 403 Forbidden
  await TestValidator.httpError(
    "403 Forbidden for non-project member",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.tasks.at(member2Connection, {
        projectId: project.id,
        taskId: task.id,
      });
    },
  );
}
