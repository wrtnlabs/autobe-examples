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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

export async function test_api_timer_stop_short_duration_rounding(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(memberAuth);
  // Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create employee record for the authenticated member
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      memberConnection,
      {
        body: {
          member_id: memberAuth.member.id,
          employment_type: "full-time",
        },
      },
    );
  typia.assert(employee);
  // 3. Create project for timer to track time against
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
        },
      },
    );
  typia.assert(project);
  // 4. Start a timer session
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        project_id: project.id,
        description: "Short duration test timer",
      },
    });
  typia.assert(timer);
  // 5. Stop the timer almost immediately (within 30 seconds)
  // The timer was just created, so elapsed time should be under 30 seconds
  const timelog: IHrmPlatformTimelog =
    await api.functional.hrmPlatform.member.timers.stop(memberConnection, {
      timerId: timer.id,
    });
  typia.assert(timelog);
  // 6. Validate timelog has duration rounded to 0 (under 30 seconds rounds to 0)
  TestValidator.equals(
    "duration rounded to 0 for under 30 seconds",
    timelog.duration_minutes,
    0,
  );
  // 7. Validate other timelog fields are correctly populated
  TestValidator.equals("employee matches", timelog.employee.id, employee.id);
  TestValidator.equals("project matches", timelog.project.id, project.id);
  TestValidator.equals("billable defaults to true", timelog.billable, true);
  TestValidator.predicate(
    "date is valid date-time",
    () => !isNaN(Date.parse(timelog.date)),
  );
  TestValidator.equals(
    "description matches timer",
    timelog.description,
    "Short duration test timer",
  );
  // 8. Validate task is null (not specified in timer creation)
  TestValidator.equals("task is null when not specified", timelog.task, null);
}
