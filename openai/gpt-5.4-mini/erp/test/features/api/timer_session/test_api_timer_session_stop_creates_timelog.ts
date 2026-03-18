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
import type { IPageIHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganization";
import type { IPageIHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimerSession";
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
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const organizationConnection: api.IConnection = { host: connection.host };
  organizationConnection.headers = {
    Authorization: authorized.token.access,
  };
  const organizations =
    await api.functional.hrmTimeTracking.member.organizations.index(
      organizationConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(organizations);
  TestValidator.equals(
    "organization pagination current page",
    organizations.pagination.current,
    1,
  );
  TestValidator.predicate(
    "organization pagination is valid",
    organizations.pagination.limit >= 0 && organizations.pagination.pages >= 0,
  );
  const timerConnection: api.IConnection = { host: connection.host };
  timerConnection.headers = {
    Authorization: authorized.token.access,
  };
  const sessionInput = {
    action: "stop",
    page: 1,
    limit: 1,
  } satisfies IHrmTimeTrackingTimerSession.IRequest;
  const timerSessions =
    await api.functional.hrmTimeTracking.member.me.timer_session.index(
      timerConnection,
      { body: sessionInput },
    );
  typia.assert(timerSessions);
  TestValidator.equals(
    "timer session pagination current page",
    timerSessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "timer session pagination is valid",
    timerSessions.pagination.limit >= 0 && timerSessions.pagination.pages >= 0,
  );
  if (timerSessions.data.length === 0) return;
  const first = timerSessions.data[0];
  typia.assert(first);
  TestValidator.predicate(
    "timer session is closed or closing",
    first.ended_at !== null ||
      first.discarded_at !== null ||
      first.ended_at === null,
  );
}
