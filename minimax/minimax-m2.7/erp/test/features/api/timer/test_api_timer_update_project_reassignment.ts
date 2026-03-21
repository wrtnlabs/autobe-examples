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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_update_project_reassignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create first project
  const firstProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(firstProject);
  // 3. Create task within first project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: firstProject.id },
    },
  );
  typia.assert(task);
  // 4. Create second project as reassignment target
  const secondProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(secondProject);
  // 5. Start timer with first project and task
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: firstProject.id,
        erp_hrm_task_id: task.id,
      },
    },
  );
  typia.assert(timer);
  // Store original start timestamp
  const originalStartTimestamp = timer.started_at;
  // 6. Update timer to change projectId to second project
  const updatedTimer = await api.functional.erpHrm.member.timers.update(
    memberConnection,
    {
      timerId: timer.id,
      body: {
        projectId: secondProject.id,
      },
    },
  );
  typia.assert(updatedTimer);
  // Validate timer project is changed to second project
  TestValidator.equals(
    "timer project changed to second project",
    updatedTimer.project.id,
    secondProject.id,
  );
  // Validate original start_timestamp is preserved
  TestValidator.equals(
    "original start_timestamp preserved",
    updatedTimer.started_at,
    originalStartTimestamp,
  );
  // Validate timer task is automatically cleared (set to null) because original task does not belong to new project
  TestValidator.equals(
    "task cleared on project change",
    updatedTimer.task,
    null,
  );
}
