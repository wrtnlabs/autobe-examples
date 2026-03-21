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

export async function test_api_timer_current_view_active_without_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and organization via member join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project within the organization
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Start a timer with only the project (no task)
  // Note: As the organization owner and project creator, the member has implicit
  // project membership, allowing them to start a timer on this project
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(timer);
  // 4. Get the current timer
  const currentTimer =
    await api.functional.erpHrm.member.timers.current.at(memberConnection);
  typia.assert(currentTimer);
  // Validation: Response body is not null, confirming an active timer exists
  TestValidator.predicate("timer exists", currentTimer !== null);
  // Validation: Timer ID matches the created timer
  TestValidator.equals("timer id matches", currentTimer.id, timer.id);
  // Validation: started_at contains a valid ISO 8601 timestamp
  TestValidator.equals(
    "started_at matches",
    currentTimer.started_at,
    timer.started_at,
  );
  // Validation: elapsed_minutes is a non-negative integer
  TestValidator.predicate(
    "elapsed_minutes is non-negative",
    currentTimer.elapsed_minutes >= 0,
  );
  // Validation: project object contains id and name matching the created project
  TestValidator.equals(
    "project id matches",
    currentTimer.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    currentTimer.project.name,
    project.name,
  );
  // Validation: task field is null (no task was assigned)
  TestValidator.equals("task is null", currentTimer.task, null);
  // Validation: description field is present
  TestValidator.equals(
    "description matches",
    currentTimer.description,
    timer.description,
  );
  // Validation: created_at and updated_at timestamps are present
  TestValidator.predicate(
    "created_at is valid",
    currentTimer.created_at !== null && currentTimer.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    currentTimer.updated_at !== null && currentTimer.updated_at !== undefined,
  );
}
