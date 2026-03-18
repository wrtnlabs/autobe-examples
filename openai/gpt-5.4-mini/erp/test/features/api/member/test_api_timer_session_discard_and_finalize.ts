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

export async function test_api_timer_session_discard_and_finalize(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const startBody = {
    action: "start",
    project_id: projectId,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IHrmTimeTrackingTimerSession.IRequest;
  const started =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: startBody,
      },
    );
  typia.assert(started);
  TestValidator.predicate(
    "a running timer session should be returned after start",
    started.data.length === 1,
  );
  const runningSession = started.data[0]!;
  TestValidator.equals(
    "started project should match",
    runningSession.project.id,
    projectId,
  );
  TestValidator.equals(
    "running timer should have no end timestamp",
    runningSession.ended_at,
    null,
  );
  TestValidator.equals(
    "running timer should have no discard timestamp",
    runningSession.discarded_at,
    null,
  );
  const discarded =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "discard",
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(discarded);
  TestValidator.predicate(
    "discard should return the closed timer session",
    discarded.data.length === 1,
  );
  const discardedSession = discarded.data[0]!;
  TestValidator.equals(
    "discarded session should match the started session",
    discardedSession.id,
    runningSession.id,
  );
  TestValidator.equals(
    "discarded session should preserve the project",
    discardedSession.project.id,
    projectId,
  );
  TestValidator.predicate(
    "discarded session should have a discard timestamp",
    discardedSession.discarded_at !== null,
  );
  TestValidator.equals(
    "discarded session should not have an end timestamp",
    discardedSession.ended_at,
    null,
  );
  const restartedAfterDiscard =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "start",
          project_id: projectId,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(restartedAfterDiscard);
  TestValidator.predicate(
    "a new timer should be startable after discard",
    restartedAfterDiscard.data.length === 1,
  );
  const runningAgain = restartedAfterDiscard.data[0]!;
  TestValidator.notEquals(
    "new timer should be a different session",
    runningAgain.id,
    discardedSession.id,
  );
  const finalized =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "stop",
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(finalized);
  TestValidator.predicate(
    "stop should return the finalized timer session",
    finalized.data.length === 1,
  );
  const finalizedSession = finalized.data[0]!;
  TestValidator.equals(
    "finalized session should match the restarted session",
    finalizedSession.id,
    runningAgain.id,
  );
  TestValidator.equals(
    "finalized session should preserve the project",
    finalizedSession.project.id,
    projectId,
  );
  TestValidator.predicate(
    "finalized session should have an end timestamp",
    finalizedSession.ended_at !== null,
  );
  TestValidator.equals(
    "finalized session should not have a discard timestamp",
    finalizedSession.discarded_at,
    null,
  );
  const restartedAfterStop =
    await api.functional.hrmTimeTracking.member.timer_sessions.index(
      memberConnection,
      {
        body: {
          action: "start",
          project_id: projectId,
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(restartedAfterStop);
  TestValidator.predicate(
    "a new timer should be startable after stop",
    restartedAfterStop.data.length === 1,
  );
  const newestSession = restartedAfterStop.data[0]!;
  TestValidator.notEquals(
    "new timer should be different after stop",
    newestSession.id,
    finalizedSession.id,
  );
}
