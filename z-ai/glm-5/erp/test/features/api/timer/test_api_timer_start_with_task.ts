import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Tests starting a timer with both project and task association for granular time tracking.
 *
 * Prerequisites setup:
 * 1. Member joins via /erpHrm/auth/member/join (creates first organization and employee record)
 * 2. Owner creates a project via /erpHrm/member/projects
 * 3. Owner creates a task for that project via /erpHrm/member/projects/{projectId}/tasks
 * 4. Owner starts timer via POST /erpHrm/member/timers specifying both project_id and task_id
 *
 * Test execution:
 * - Call POST /erpHrm/member/timers with valid project_id and valid task_id belonging to same project
 * - Verify response contains timer record with:
 *   - started_at timestamp
 *   - project association matching request
 *   - task association matching request (task belongs to the same project)
 *   - elapsed_minutes starts at 0
 */
export async function test_api_timer_start_with_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - creates first organization and employee record
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 3. Create a task within the project for task-specific time tracking
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  // 4. Start timer with both project_id and task_id
  const timer = await api.functional.erpHrm.member.timers.create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        task_id: task.id,
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // 5. Validate timer response
  TestValidator.equals("project association", timer.project.id, project.id);
  TestValidator.equals("task association", timer.task?.id, task.id);
  TestValidator.equals("elapsed minutes starts at 0", timer.elapsed_minutes, 0);
  TestValidator.predicate("started_at timestamp exists", !!timer.started_at);
}
