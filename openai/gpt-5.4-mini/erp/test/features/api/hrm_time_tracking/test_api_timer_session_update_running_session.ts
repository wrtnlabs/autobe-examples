import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_timer_sessions_create } from "../../../generate/generate_random_hrm_time_tracking_member_timer_sessions_create";
import { prepare_random_hrm_time_tracking_timer_session } from "../../../prepare/prepare_random_hrm_time_tracking_timer_session";

export async function test_api_timer_session_update_running_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credential = {
    email: `member-${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: credential,
  });
  const runningSession =
    await api.functional.hrmTimeTracking.member.timer_sessions.create(
      memberConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(runningSession);
  const before = await api.functional.hrmTimeTracking.member.timer_sessions.at(
    memberConnection,
    {
      timerSessionId: runningSession.id,
    },
  );
  typia.assert(before);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updated =
    await api.functional.hrmTimeTracking.member.timer_sessions.update(
      memberConnection,
      {
        timerSessionId: runningSession.id,
        body: {
          description: updatedDescription,
        } satisfies IHrmTimeTrackingTimerSession.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("session id preserved", updated.id, runningSession.id);
  TestValidator.equals(
    "started_at preserved",
    updated.started_at,
    before.started_at,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals("session remains active", updated.ended_at, null);
  TestValidator.equals("session not discarded", updated.discarded_at, null);
  TestValidator.notEquals(
    "updated session differs from original",
    before.updated_at,
    updated.updated_at,
  );
  const after = await api.functional.hrmTimeTracking.member.timer_sessions.at(
    memberConnection,
    {
      timerSessionId: runningSession.id,
    },
  );
  typia.assert(after);
  TestValidator.equals(
    "persisted description",
    after.description,
    updatedDescription,
  );
  TestValidator.equals(
    "persisted started_at",
    after.started_at,
    before.started_at,
  );
  TestValidator.equals("persisted active state", after.ended_at, null);
  TestValidator.equals("persisted not discarded", after.discarded_at, null);
}
