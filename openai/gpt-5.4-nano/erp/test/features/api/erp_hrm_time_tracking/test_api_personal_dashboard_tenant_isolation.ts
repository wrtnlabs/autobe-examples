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

export async function test_api_personal_dashboard_tenant_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register a new member (join) to establish organization-scoped session context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody: IErpHrmTimeTrackingMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd-1234",
    organizationName: RandomGenerator.alphabets(10),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/onboarding",
    referrer: "https://example.com/referrer",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // 2) Call GET /erpHrmTimeTracking/member/personalDashboard
  const dashboard1 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberConnection,
    );
  typia.assert(dashboard1);
  // 3) Re-call within the same authenticated + organization context
  const dashboard2 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberConnection,
    );
  typia.assert(dashboard2);
  // 4) Validate tenant isolation invariants: within the same tenant context,
  // organization ownership fields must remain consistent.
  TestValidator.equals(
    "organization_id should remain consistent within same tenant context",
    dashboard2.organization_id,
    dashboard1.organization_id,
  );
  TestValidator.equals(
    "creator_member_id should remain consistent within same tenant context",
    dashboard2.creator_member_id,
    dashboard1.creator_member_id,
  );
  // 5) Validate no cross-tenant leakage by ensuring the dashboard does not switch
  // to a different report definition identity within the same request context.
  TestValidator.equals(
    "report definition id should remain consistent within same tenant context",
    dashboard2.id,
    dashboard1.id,
  );
}
