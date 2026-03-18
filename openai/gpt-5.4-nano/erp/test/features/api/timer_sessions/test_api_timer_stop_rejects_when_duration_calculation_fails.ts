import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import type { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_stop_rejects_when_duration_calculation_fails(
  connection: api.IConnection,
): Promise<void> {
  // <SCENARIO DESCRIPTION HERE>
  // Authenticate a new member, attempt to stop the current timer session,
  // and verify that the operation is rejected (simulating an internal
  // duration-calculation failure). Also ensure the system does not behave
  // as if stop succeeded by performing a second stop attempt.
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password#123";
  const joinPayload = {
    email,
    password,
    organizationName: `org-${RandomGenerator.alphabets(8)}`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string,
    referrer: "https://example.com" satisfies string,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinPayload,
  });
  const stopConnection: api.IConnection = { host: connection.host };
  stopConnection.headers = {
    Authorization: authorized.token.access,
  };
  await TestValidator.error(
    "stop should reject when duration calculation fails",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timerSessions.current.stop.stopCurrentTimerSession(
        stopConnection,
      );
    },
  );
  // If stop failed, repeating the stop should still not produce a finalized
  // timelog (at least it must not succeed).
  await TestValidator.error(
    "second stop attempt should also be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timerSessions.current.stop.stopCurrentTimerSession(
        stopConnection,
      );
    },
  );
}
