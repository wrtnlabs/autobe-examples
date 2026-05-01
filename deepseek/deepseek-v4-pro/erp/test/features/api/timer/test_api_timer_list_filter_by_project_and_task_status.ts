import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimer";
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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

/**
 * Test timer list filtering by project ID and task assignment status.
 *
 * Validates that the timer list endpoint correctly filters active timers by project and task assignment status. The test creates a project, assigns the authenticated employee as a project member, starts a timer without a task, then queries the timer list with combined filters to verify intersection logic.
 *
 * 1. Authenticate as a new member via join, establishing organization context.
 * 2. Create a project to use as the filter target.
 * 3. Assign the authenticated employee as a project member to enable timer creation.
 * 4. Start a timer tracking against the project with task explicitly set to null.
 * 5. Query timers with project_ids and has_task=false — verify at least one result, all returned timers belong to the filtered project, and all have null task.
 * 6. Query timers with the same project_ids but has_task=true — verify zero results since the only active timer has no task.
 */
export async function test_api_timer_list_filter_by_project_and_task_status(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  // 3. Assign the authenticated employee as a project member
  await generate_random_erp_hrm_member_projects_members_create(
    memberConnection,
    { params: { projectId: project.id } },
  );
  // 4. Start a timer without a task
  await generate_random_erp_hrm_member_timers_create(memberConnection, {
    body: { erp_hrm_project_id: project.id, erp_hrm_task_id: null },
  });
  // 5. Query timers with project filter and has_task=false
  const resultWithoutTask = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        project_ids: [project.id],
        has_task: false,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(resultWithoutTask);
  TestValidator.predicate(
    "timers with has_task=false should include at least one result",
    resultWithoutTask.data.length >= 1,
  );
  for (const t of resultWithoutTask.data) {
    TestValidator.equals(
      "timer belongs to the filtered project",
      t.project.id,
      project.id,
    );
    TestValidator.equals("timer has no task assigned", t.task, null);
  }
  // 6. Query timers with project filter and has_task=true
  const resultWithTask = await api.functional.erpHrm.member.timers.index(
    memberConnection,
    {
      body: {
        project_ids: [project.id],
        has_task: true,
      } satisfies IErpHrmTimer.IRequest,
    },
  );
  typia.assert(resultWithTask);
  TestValidator.equals(
    "no timers returned when has_task=true but only timer has no task",
    resultWithTask.data.length,
    0,
  );
}
