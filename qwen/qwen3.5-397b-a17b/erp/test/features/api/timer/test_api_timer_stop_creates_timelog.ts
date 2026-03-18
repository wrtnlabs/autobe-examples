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

/**
 * Test stopping a running timer creates a timelog entry.
 *
 * This test validates the core timer workflow:
 * 1. Member joins and gets authenticated
 * 2. Employee record is created for the member
 * 3. Project is created for time tracking
 * 4. Timer is started with project assignment
 * 5. Timer is stopped, which should create a timelog
 * 6. Verify timelog has correct structure and inherits timer data
 */
export async function test_api_timer_stop_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create employee record for the authenticated member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authResult.member.id,
      },
    },
  );
  typia.assert(employee);
  // 3. Create project for timer to track time against
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
      },
    },
  );
  typia.assert(project);
  // 4. Start a timer session with project assignment
  const timer = await generate_random_hrm_platform_member_timers_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timer);
  // 5. Stop the timer - this should create a timelog
  const timelog = await api.functional.hrmPlatform.member.timers.stop(
    memberConnection,
    {
      timerId: timer.id,
    },
  );
  typia.assert(timelog);
  // 6. Verify timelog has correct structure and inherits timer data
  TestValidator.equals(
    "timelog project matches timer",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog employee matches",
    timelog.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "timelog description matches timer",
    timelog.description,
    timer.description,
  );
  TestValidator.predicate("duration is positive", timelog.duration_minutes > 0);
  TestValidator.equals("billable defaults to true", timelog.billable, true);
  TestValidator.predicate(
    "timelog date matches timer start date",
    timelog.date.startsWith(timer.started_at.substring(0, 10)),
  );
}
