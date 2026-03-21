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
import { generate_random_erp_hrm_member_timers_start } from "../../../generate/generate_random_erp_hrm_member_timers_start";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_start_with_project_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via POST /erpHrm/auth/member/join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project via POST /erpHrm/member/projects
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        color: ("#" + RandomGenerator.alphaNumeric(6).toUpperCase()) as string &
          tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  typia.assert(project);
  // 3. Start a timer via POST /erpHrm/member/timers/start with project ID only
  const timer = await api.functional.erpHrm.member.timers.start(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: "Working on project without task assignment",
      } satisfies IErpHrmTimer.ICreate,
    },
  );
  typia.assert(timer);
  // Validation: Timer should have started_at timestamp
  TestValidator.predicate("started_at exists", timer.started_at !== undefined);
  TestValidator.predicate(
    "started_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timer.started_at),
  );
  // Validation: Timer should be associated with correct project
  TestValidator.equals("project ID matches", timer.project.id, project.id);
  TestValidator.equals(
    "project name matches",
    timer.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    timer.project.color,
    project.color,
  );
  // Validation: Timer should have no task assigned (task is optional)
  TestValidator.equals(
    "task is undefined or null",
    timer.task === undefined || timer.task === null,
    true,
  );
  // Validation: Employee relationship should be established from JWT context
  TestValidator.predicate("employee exists", timer.employee !== undefined);
  TestValidator.equals(
    "employee member ID matches",
    timer.employee.member.id,
    authorized.id,
  );
  // Validation: elapsed_time_ms should be computed and positive
  TestValidator.predicate(
    "elapsed_time_ms is positive",
    (timer.elapsed_time_ms ?? 0) > 0,
  );
}
