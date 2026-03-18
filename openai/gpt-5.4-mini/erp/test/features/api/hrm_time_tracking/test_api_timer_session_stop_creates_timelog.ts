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
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
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
import { generate_random_hrm_time_tracking_member_me_timer_session_start_create } from "../../../generate/generate_random_hrm_time_tracking_member_me_timer_session_start_create";
import { prepare_random_hrm_time_tracking_timer_session } from "../../../prepare/prepare_random_hrm_time_tracking_timer_session";

export async function test_api_timer_session_stop_creates_timelog(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const timer =
    await generate_random_hrm_time_tracking_member_me_timer_session_start_create(
      memberConnection,
      {
        body: {
          project_id: projectId,
          task_id: taskId,
          description,
        } satisfies IHrmTimeTrackingTimerSession.ICreate,
      },
    );
  typia.assert(timer);
  const startedAt = new Date(timer.started_at).getTime();
  const stopCalledAt = Date.now();
  const timelog =
    await api.functional.hrmTimeTracking.member.me.timer_session.stop(
      memberConnection,
    );
  typia.assert(timelog);
  TestValidator.equals(
    "organization preserved",
    timelog.organization,
    timer.project.organization,
  );
  TestValidator.equals("employee preserved", timelog.employee, timer.employee);
  TestValidator.equals("project preserved", timelog.project, timer.project);
  TestValidator.equals("task preserved", timelog.task, timer.task);
  TestValidator.equals(
    "description preserved",
    timelog.description,
    timer.description,
  );
  const expectedDuration = Math.max(
    1,
    Math.round((stopCalledAt - startedAt) / 60000),
  );
  TestValidator.equals(
    "rounded duration preserved",
    timelog.duration_minutes,
    expectedDuration,
  );
}
