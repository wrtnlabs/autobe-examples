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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_task_project_mismatch_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create project A
  const projectA = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectA);
  // 3. Create project B
  const projectB = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(projectB);
  // 4. Assign employee to project A
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectA.id },
    },
  );
  // 5. Assign employee to project B
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: projectB.id },
    },
  );
  // 6. Create task under project A
  const taskInProjectA =
    await generate_random_erp_hrm_member_projects_tasks_create(
      memberConnection,
      {
        params: { projectId: projectA.id },
      },
    );
  typia.assert(taskInProjectA);
  // 7. Attempt to start timer with project B but task from project A
  // This should fail because the task belongs to project A, not project B
  await TestValidator.error(
    "timer creation fails when task belongs to different project",
    async () => {
      await api.functional.erpHrm.member.timers.create(memberConnection, {
        body: {
          erp_hrm_project_id: projectB.id,
          erp_hrm_task_id: taskInProjectA.id,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IErpHrmTimer.ICreate,
      });
    },
  );
}
