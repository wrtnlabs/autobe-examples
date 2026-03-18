import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_stop_creates_rounded_timelog(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const workDescription = RandomGenerator.paragraph({ sentences: 2 });
  const joinEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: joinEmail,
      password: "Password!2345",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: undefined,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const authConnection: api.IConnection = memberConnection;
  // 2) Configure a running timer session by PATCH /member/timerSessions
  const projectSessionSearch =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      authConnection,
      {
        body: {
          isActive: false,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(projectSessionSearch);
  const selectedProject = projectSessionSearch.data[0]?.project;
  if (!selectedProject) throw new Error("No project found to configure timer");
  const configured =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      authConnection,
      {
        body: {
          projectId: selectedProject.id,
          taskId: null,
          isActive: true,
          descriptionSearch: workDescription,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(configured);
  const running = configured.data.find((s) => s.is_active);
  if (!running) throw new Error("No active timer session after configuration");
  const startedAtMs = new Date(running.started_at).getTime();
  await new Promise((r) => setTimeout(r, 80));
  // 3) Stop current timer
  const timelog =
    await api.functional.erpHrmTimeTracking.member.timerSessions.current.stop.stopCurrentTimerSession(
      authConnection,
    );
  typia.assert(timelog);
  TestValidator.equals("timelog deleted_at", timelog.deleted_at, null);
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    running.project.id,
  );
  // note/work description
  TestValidator.equals(
    "timelog note matches",
    timelog.note,
    running.description,
  );
  // task edge: configured without a task => task should be null
  TestValidator.equals(
    "timelog task is null when no task selected",
    timelog.task,
    null,
  );
  // duration rounding verification
  TestValidator.predicate("start_time exists", timelog.start_time !== null);
  TestValidator.predicate("end_time exists", timelog.end_time !== null);
  const endTimeMs = new Date(timelog.end_time!).getTime();
  const rawMinutes = (endTimeMs - startedAtMs) / 60000;
  const expectedRounded = Math.round(rawMinutes);
  TestValidator.equals(
    "duration_minutes rounded",
    timelog.duration_minutes,
    expectedRounded,
  );
  // 4) Ensure timer session is no longer active
  const afterStop =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      authConnection,
      {
        body: {
          isActive: true,
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(afterStop);
  TestValidator.predicate(
    "no active sessions after stop",
    afterStop.data.every((s) => !s.is_active),
  );
  await TestValidator.error(
    "second stop should fail when no running session",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timerSessions.current.stop.stopCurrentTimerSession(
        authConnection,
      );
    },
  );
}
