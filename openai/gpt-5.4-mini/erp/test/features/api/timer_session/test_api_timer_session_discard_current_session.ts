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

export async function test_api_timer_session_discard_current_session(
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
  memberConnection.headers = {
    ...(memberConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  const organizations =
    await api.functional.hrmTimeTracking.member.organizations.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(organizations);
  TestValidator.predicate(
    "member should have at least one accessible organization",
    organizations.data.length > 0,
  );
  const discardResult =
    await api.functional.hrmTimeTracking.member.me.timer_session.index(
      memberConnection,
      {
        body: {
          action: "discard",
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(discardResult);
  TestValidator.predicate(
    "discard endpoint should return a paginated timer-session response",
    discardResult.pagination.current >= 1 &&
      discardResult.pagination.limit >= 0,
  );
  TestValidator.equals(
    "discarding without an active timer should not produce timer sessions",
    discardResult.data.length,
    0,
  );
  const currentTimer =
    await api.functional.hrmTimeTracking.member.me.timer_session.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingTimerSession.IRequest,
      },
    );
  typia.assert(currentTimer);
  TestValidator.equals(
    "no active timer should remain",
    currentTimer.data.length,
    0,
  );
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(secondAuthorized);
  secondMemberConnection.headers = {
    ...(secondMemberConnection.headers ?? {}),
    Authorization: `Bearer ${secondAuthorized.token.access}`,
  };
  const secondOrganizations =
    await api.functional.hrmTimeTracking.member.organizations.index(
      secondMemberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IHrmTimeTrackingOrganization.IRequest,
      },
    );
  typia.assert(secondOrganizations);
  TestValidator.predicate(
    "second member should also have an accessible organization set",
    secondOrganizations.data.length > 0,
  );
  await TestValidator.error(
    "another member cannot affect this member's current timer context through discard",
    async () => {
      await api.functional.hrmTimeTracking.member.me.timer_session.index(
        secondMemberConnection,
        {
          body: {
            action: "discard",
            page: 1,
            limit: 100,
          } satisfies IHrmTimeTrackingTimerSession.IRequest,
        },
      );
    },
  );
}
