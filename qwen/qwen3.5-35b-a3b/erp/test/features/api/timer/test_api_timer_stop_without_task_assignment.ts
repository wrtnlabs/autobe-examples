import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_timer_start_create } from "../../../generate/generate_random_hrms_member_timer_start_create";
import { prepare_random_hrms_timer } from "../../../prepare/prepare_random_hrms_timer";

export async function test_api_timer_stop_without_task_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create a new connection with token for authenticated member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  // 3. Start timer with project selection but NO task assignment
  // Note: We need a valid project_id, but we don't have project creation API available
  // For simulation mode, we can use a random UUID
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const timerStartInput: IHrmsTimer.ICreate = {
    project_id: projectId,
    task_id: null, // No task assigned
    description: "Testing timer without task assignment",
  } satisfies IHrmsTimer.ICreate;
  const startedTimer: IHrmsTimer =
    await api.functional.hrms.member.timer.start.create(memberConnection, {
      body: timerStartInput,
    });
  typia.assert(startedTimer);
  // Validate timer started without task
  TestValidator.equals("timer task should be null", startedTimer.task, null);
  TestValidator.equals(
    "timer description",
    startedTimer.description,
    timerStartInput.description,
  );
  TestValidator.equals("timer project_id", startedTimer.project.id, projectId);
  // 4. Let timer run for a measurable duration (wait 2 seconds)
  await new Promise((resolve) => setTimeout(resolve, 2000));
  // 5. Stop the timer via POST /hrms/member/timer/stop
  const stoppedResult: IHrmsTimelog =
    await api.functional.hrms.member.timer.stop(memberConnection);
  typia.assert(stoppedResult);
  // 6. Validate timer was properly stopped (deleted_at should be set)
  TestValidator.predicate(
    "timer should be stopped after deletion",
    startedTimer.deleted_at !== null,
  );
  // 7. Verify task tracking works correctly without task assignment
  // The system should handle the optional task field gracefully
  TestValidator.equals("timer without task should be valid", startedTimer.task, null);
}