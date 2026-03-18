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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_session_start_update_stop(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const taskId = typia.random<string & tags.Format<"uuid">>();
  const description = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const started =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "start",
          project_id: projectId,
          task_id: taskId,
          description,
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(started);
  TestValidator.predicate(
    "timer session page contains started record",
    started.data.length > 0,
  );
  const startedSession = started.data[0];
  TestValidator.equals(
    "timer session starts with requested project",
    startedSession.project.id,
    projectId,
  );
  TestValidator.equals(
    "timer session starts with requested task",
    startedSession.task?.id,
    taskId,
  );
  TestValidator.equals(
    "timer session starts with requested description",
    startedSession.description,
    description,
  );
  const startedAt = startedSession.started_at;
  const updated =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "update",
          project_id: projectId,
          task_id: taskId,
          description: updatedDescription,
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(updated);
  TestValidator.predicate(
    "timer session page contains updated record",
    updated.data.length > 0,
  );
  const updatedSession = updated.data[0];
  TestValidator.equals(
    "timer session keeps the same start time while running",
    updatedSession.started_at,
    startedAt,
  );
  TestValidator.equals(
    "timer session keeps the same project while updated",
    updatedSession.project.id,
    projectId,
  );
  TestValidator.equals(
    "timer session keeps the same task while updated",
    updatedSession.task?.id,
    taskId,
  );
  TestValidator.equals(
    "timer session updates description while running",
    updatedSession.description,
    updatedDescription,
  );
  const stopped =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "stop",
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(stopped);
  TestValidator.predicate(
    "stopped timer session page contains finalized record",
    stopped.data.length > 0,
  );
  const stoppedSession = stopped.data[0];
  TestValidator.equals(
    "stopped timer session keeps the same start time",
    stoppedSession.started_at,
    startedAt,
  );
  TestValidator.equals(
    "stopped timer session keeps the same project",
    stoppedSession.project.id,
    projectId,
  );
  TestValidator.equals(
    "stopped timer session keeps the same task",
    stoppedSession.task?.id,
    taskId,
  );
  TestValidator.equals(
    "stopped timer session keeps the latest description",
    stoppedSession.description,
    updatedDescription,
  );
  TestValidator.predicate(
    "stopped timer session is ended",
    stoppedSession.ended_at !== null,
  );
  TestValidator.equals(
    "stopped timer session is no longer running",
    stoppedSession.discarded_at,
    null,
  );
  const page = await api.functional.hrmTimeTracking.member.timer_sessions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmTimeTrackingTimerSession.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "timer session page has pagination records",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "timer session page has at least one result",
    page.data.length >= 1,
  );
}
