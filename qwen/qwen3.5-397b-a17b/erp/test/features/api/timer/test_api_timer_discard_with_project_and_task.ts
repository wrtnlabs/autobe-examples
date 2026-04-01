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
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_timers_create } from "../../../generate/generate_random_hrm_platform_member_timers_create";
import { prepare_random_hrm_platform_timer } from "../../../prepare/prepare_random_hrm_platform_timer";

/**
 * Test the timer discard operation when an employee has a running timer tracking work on a specific task within a project.
 *
 * **Test Steps:**
 * 1. Authenticate as a member by joining the platform using authorize_member_join utility
 * 2. Start a new timer with a project and task assignment, including an optional description
 * 3. Discard the running timer
 * 4. Validate the response contains the discarded timer data including project, task, description, and start timestamp
 * 5. Verify the discarded timer data matches what was started (project, task, description preserved)
 *
 * **Validation Points:**
 * - Discard operation returns HTTP 200 with complete timer snapshot
 * - Response includes timer ID, employee, project, task, description, started_at, and timestamps
 * - The discarded timer data matches what was started (project ID, task ID, description preserved)
 */
export async function test_api_timer_discard_with_project_and_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Start a timer with project and task
  const timerCreateBody: IHrmPlatformTimer.ICreate = {
    project_id: typia.random<string & tags.Format<"uuid">>(),
    task_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IHrmPlatformTimer.ICreate;
  const startedTimer: IHrmPlatformTimer =
    await generate_random_hrm_platform_member_timers_create(memberConnection, {
      body: timerCreateBody,
    });
  typia.assert(startedTimer);
  // 3. Discard the running timer
  const discardedTimer: IHrmPlatformTimer =
    await api.functional.hrmPlatform.member.timers.discard(memberConnection);
  typia.assert(discardedTimer);
  // 4. Validate discarded timer contains expected data
  TestValidator.equals("timer ID matches", discardedTimer.id, startedTimer.id);
  TestValidator.equals(
    "project matches",
    discardedTimer.project.id,
    startedTimer.project.id,
  );
  TestValidator.equals(
    "description matches",
    discardedTimer.description,
    startedTimer.description,
  );
  // 5. Validate task if it was provided
  if (
    timerCreateBody.task_id !== null &&
    timerCreateBody.task_id !== undefined
  ) {
    typia.assertGuard(discardedTimer.task!);
    TestValidator.equals(
      "task ID matches",
      discardedTimer.task.id,
      timerCreateBody.task_id,
    );
  }
}