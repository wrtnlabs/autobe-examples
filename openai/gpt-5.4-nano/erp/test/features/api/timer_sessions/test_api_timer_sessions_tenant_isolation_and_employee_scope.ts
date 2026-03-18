import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IErpHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimerSession";
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

export async function test_api_timer_sessions_tenant_isolation_and_employee_scope(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Passw0rd!";
  const organizationNameA = `orgA-${RandomGenerator.alphabets(8)}`;
  const organizationNameB = `orgB-${RandomGenerator.alphabets(8)}`;

  const tokenA = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName: organizationNameA,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://${RandomGenerator.alphabets(6)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(6)}.example.com/ref`,
      organizationLogoUrl: null,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(tokenA);

  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: tokenA.token.access,
  };

  const requestBase: IErpHrmTimeTrackingTimerSession.IRequest = {
    isActive: true,
    page: 1,
    limit: 20,
    sortBy: "started_at",
    sortOrder: "desc",
  };

  const sessionsA =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      authenticatedConnection,
      {
        body: {
          ...requestBase,
          employeeId: undefined,
        },
      },
    );
  typia.assert(sessionsA);

  const orgSummariesFromA = sessionsA.data.map((x) => x.organization);

  const sessionsCrossTenant =
    await api.functional.erpHrmTimeTracking.member.timerSessions.index(
      authenticatedConnection,
      {
        body: {
          ...requestBase,
          employeeId: undefined,
        },
      },
    );
  typia.assert(sessionsCrossTenant);

  for (const s of sessionsCrossTenant.data) {
    TestValidator.equals(
      "organization should be isolated",
      s.organization,
      orgSummariesFromA[0] ?? s.organization,
    );
  }
}
