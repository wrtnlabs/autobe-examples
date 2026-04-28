import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import type { IPersonalDashboardView } from "@ORGANIZATION/PROJECT-api/lib/structures/IPersonalDashboardView";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_dashboard_active_timer_only(
  connection: api.IConnection,
) {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Create project to start the timer against
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {},
    );
  // 3. Start the active timer on the project
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        project_id: project.id,
      },
    });
  // 4. Fetch and validate the personal dashboard state
  const dashboard: IPersonalDashboardView =
    await api.functional.hrmPlatform.member.personal_dashboard.at(
      memberConnection,
    );
  typia.assert(dashboard);
  // 5. Validate active timer properties
  TestValidator.predicate("activeTimer exists", dashboard.activeTimer !== null);
  if (dashboard.activeTimer !== null) {
    TestValidator.equals(
      "activeTimer.employee.id",
      dashboard.activeTimer.employee.id,
      timer.employee.id,
    );
    TestValidator.equals(
      "activeTimer.project.id",
      dashboard.activeTimer.project.id,
      timer.project.id,
    );
    TestValidator.equals(
      "activeTimer.duration_seconds",
      dashboard.activeTimer.duration_seconds,
      null,
    );
    TestValidator.equals(
      "activeTimer.stopped_at",
      dashboard.activeTimer.stopped_at,
      null,
    );
    TestValidator.predicate(
      "activeTimer.is_active",
      dashboard.activeTimer.is_active,
    );
  }
  // 6. Validate other dashboard sections are empty or zero.
  // A running timer does not contribute hours until stopped and converted to a timelog.
  TestValidator.equals("hoursToday", dashboard.hoursToday, 0);
  TestValidator.equals("hoursThisWeek", dashboard.hoursThisWeek, 0);
  TestValidator.equals(
    "recentTimelogs is empty",
    dashboard.recentTimelogs.length,
    0,
  );
  TestValidator.equals(
    "pendingTimesheet is null",
    dashboard.pendingTimesheet,
    null,
  );
  TestValidator.equals(
    "assignedTasks is empty",
    dashboard.assignedTasks.length,
    0,
  );
}
