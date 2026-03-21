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
import { generate_random_erp_hrm_member_timers_create } from "../../../generate/generate_random_erp_hrm_member_timers_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timer } from "../../../prepare/prepare_random_erp_hrm_timer";

export async function test_api_timer_stop_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#3B82F6",
        status: "active",
        description: "Test project for timer stop",
      },
    },
  );
  typia.assert(project);
  // 3. Start a timer with the project
  const timer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: "Working on test task",
      },
    },
  );
  typia.assert(timer);
  // Record start time to calculate expected duration
  const startTime = new Date(timer.started_at);
  // 4. Wait for elapsed time to accumulate (2-3 seconds for meaningful duration)
  await new Promise((resolve) => setTimeout(resolve, 2500));
  // 5. Stop the timer
  const timelog =
    await api.functional.erpHrm.member.timers.stop(memberConnection);
  typia.assert(timelog);
  // 6. Validate timelog properties
  // Project should be inherited
  TestValidator.equals("project_id matches", timelog.project.id, project.id);
  // Billable should be true by default
  TestValidator.equals("billable is true", timelog.billable, true);
  // Date should match the date portion of timer's started_at
  const expectedDate = startTime.toISOString().split("T")[0];
  const actualDate = timelog.date.split("T")[0];
  TestValidator.equals(
    "date matches timer's started_at date",
    actualDate,
    expectedDate,
  );
  // Duration should be calculated and rounded to nearest minute
  // Duration_minutes minimum is 1 (at least 1 minute for 2.5 seconds wait)
  TestValidator.predicate(
    "duration is positive",
    timelog.duration_minutes >= 1,
  );
  // Description should be inherited from timer
  TestValidator.equals(
    "description matches",
    timelog.description,
    "Working on test task",
  );
  // 7. Verify employee can start a new timer immediately
  const newTimer = await generate_random_erp_hrm_member_timers_create(
    memberConnection,
    {
      body: {
        erp_hrm_project_id: project.id,
        description: "New timer after stopping previous",
      },
    },
  );
  typia.assert(newTimer);
  TestValidator.predicate(
    "new timer started successfully",
    newTimer.id.length > 0,
  );
}
