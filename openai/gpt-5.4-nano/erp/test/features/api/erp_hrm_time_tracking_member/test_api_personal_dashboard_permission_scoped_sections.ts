import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_personal_dashboard_permission_scoped_sections(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member (join) to obtain tokens and organization context.
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-" + RandomGenerator.alphabets(10);
  const joinPayload = {
    email,
    password,
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberAuth = await authorize_member_join(joinConnection, {
    body: joinPayload,
  });
  typia.assert(memberAuth);
  // The authorization utility is expected to update joinConnection.headers.
  // Use ONLY actor-specific connections.
  const memberConnection: api.IConnection = joinConnection;
  // 2) Call dashboard in a base mode.
  const dashboard1 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberConnection,
    );
  typia.assert(dashboard1);
  // 3) Call dashboard again to validate no side effects in the observable payload.
  const dashboard2 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberConnection,
    );
  typia.assert(dashboard2);
  // 4) Validate tenant-scoping stability at least via organization_id.
  TestValidator.equals(
    "dashboard should remain tenant-scoped across repeated calls (organization_id)",
    dashboard2.organization_id,
    dashboard1.organization_id,
  );
  // 5) Validate stable identity fields where available.
  TestValidator.equals(
    "dashboard should keep report identity across repeated calls (id)",
    dashboard2.id,
    dashboard1.id,
  );
}
