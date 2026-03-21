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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_start_for_project(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins (creates first organization with owner role)
  // The member becomes owner of their organization and gets an active employee record
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create an active project where the member (as owner) can track time
  // Owner is automatically a project member with full permissions
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Start timer with only project_id (no task specified)
  // This is the most common use case - tracking time on a project without a specific task
  const timerCreateBody: IErpHrmTimer.ICreate = {
    project_id: project.id,
    task_id: null,
    description: null,
  } satisfies IErpHrmTimer.ICreate;
  const timer = await api.functional.erpHrm.member.timers.create(
    memberConnection,
    {
      body: timerCreateBody,
    },
  );
  typia.assert(timer);
  // Step 4: Validate timer response matches expectations
  TestValidator.equals("project association", timer.project.id, project.id);
  TestValidator.predicate("task is null", timer.task === null);
  TestValidator.equals(
    "elapsed minutes starts at zero",
    timer.elapsed_minutes,
    0,
  );
  TestValidator.predicate("description is null", timer.description === null);
  TestValidator.predicate(
    "started_at is recent timestamp",
    Date.now() - new Date(timer.started_at).getTime() < 10000,
  );
}
