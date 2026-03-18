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
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test that attempting to update a stopped timer is rejected by the system.
 * 1. Authenticate as member employee
 * 2. Create a project for timer tracking
 * 3. Start a running timer session
 * 4. Stop the timer (creates timelog)
 * 5. Attempt to update stopped timer - should fail
 * 6. Verify error response
 */
export async function test_api_timer_update_stopped_timer_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member employee
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a project for timer tracking
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#3498db",
        } satisfies IHrmPlatformProject.ICreate,
      },
    );
  typia.assert(project);
  // 3. Start a running timer session
  const timer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: {
        project_id: project.id,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmPlatformTimer.ICreate,
    });
  typia.assert(timer);
  // Verify timer is running (stopped_at is null or undefined)
  TestValidator.predicate(
    "timer is running",
    timer.stopped_at === null || timer.stopped_at === undefined,
  );
  // 4. Stop the timer (creates timelog entry)
  const timelog: IHrmPlatformTimelog =
    await api.functional.hrmPlatform.member.timers.stop(memberConnection, {
      timerId: timer.id,
    });
  typia.assert(timelog);
  // Verify timelog was created with correct references
  TestValidator.equals(
    "timelog employee matches",
    timelog.employee.id,
    authorized.id,
  );
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  // 5. Attempt to update the stopped timer - should fail
  // The business rule: timer properties can only be modified while timer is running
  await TestValidator.error("stopped timer update rejected", async () => {
    await api.functional.hrmPlatform.member.timers.update(memberConnection, {
      timerId: timer.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IHrmPlatformTimer.IUpdate,
    });
  });
  // 6. Attempt to change project on stopped timer - should also fail
  await TestValidator.error(
    "stopped timer project change rejected",
    async () => {
      await api.functional.hrmPlatform.member.timers.update(memberConnection, {
        timerId: timer.id,
        body: {
          project_id: project.id,
        } satisfies IHrmPlatformTimer.IUpdate,
      });
    },
  );
}
