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
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_timer_sessions_create } from "../../../generate/generate_random_hrm_time_tracking_member_timer_sessions_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_timer_session } from "../../../prepare/prepare_random_hrm_time_tracking_timer_session";

export async function test_api_timer_session_get_own_running_session(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const timerDescription = RandomGenerator.paragraph({ sentences: 2 });
  const timerSession =
    await generate_random_hrm_time_tracking_member_timer_sessions_create(
      memberConnection,
      {
        body: {
          project_id: typia.random<string & tags.Format<"uuid">>(),
          description: timerDescription,
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(timerSession);
  const gotten = await api.functional.hrmTimeTracking.member.timer_sessions.at(
    memberConnection,
    {
      timerSessionId: timerSession.id,
    },
  );
  typia.assert(gotten);
  TestValidator.equals("timer session id", gotten.id, timerSession.id);
  TestValidator.equals(
    "timer session description",
    gotten.description,
    timerDescription,
  );
  TestValidator.equals(
    "timer session started_at",
    gotten.started_at,
    timerSession.started_at,
  );
  TestValidator.equals(
    "timer session employee",
    gotten.employee,
    timerSession.employee,
  );
  TestValidator.equals(
    "timer session project",
    gotten.project,
    timerSession.project,
  );
  TestValidator.equals("timer session task", gotten.task, timerSession.task);
  TestValidator.equals(
    "timer session ended_at",
    gotten.ended_at,
    timerSession.ended_at,
  );
  TestValidator.equals(
    "timer session discarded_at",
    gotten.discarded_at,
    timerSession.discarded_at,
  );
  TestValidator.equals(
    "timer session created_at",
    gotten.created_at,
    timerSession.created_at,
  );
  TestValidator.equals(
    "timer session updated_at",
    gotten.updated_at,
    timerSession.updated_at,
  );
  TestValidator.equals(
    "timer session deleted_at",
    gotten.deleted_at,
    timerSession.deleted_at,
  );
}
