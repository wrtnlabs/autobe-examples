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

export async function test_api_personal_dashboard_no_activity_log_side_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register first member (Org A)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8).toLowerCase()}@example.com`,
      password: "Password-1234!",
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(6)}`,
      referrer: `https://referrer.example.com/${RandomGenerator.alphabets(6)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Register second member (Org B)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8).toLowerCase()}@example.com`,
      password: "Password-1234!",
      organizationName: `org-${RandomGenerator.alphabets(8)}`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 1 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://example.com/${RandomGenerator.alphabets(6)}`,
      referrer: `https://referrer.example.com/${RandomGenerator.alphabets(6)}`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 3) Call dashboard multiple times for member A and ensure stability
  const dashboardA1 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberAConnection,
    );
  typia.assert(dashboardA1);
  const dashboardA2 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberAConnection,
    );
  typia.assert(dashboardA2);
  const dashboardA3 =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberAConnection,
    );
  typia.assert(dashboardA3);
  TestValidator.equals(
    "member A dashboard id stable",
    dashboardA2.id,
    dashboardA1.id,
  );
  TestValidator.equals(
    "member A dashboard code stable",
    dashboardA2.code,
    dashboardA1.code,
  );
  TestValidator.equals(
    "member A dashboard organization_id stable",
    dashboardA2.organization_id,
    dashboardA1.organization_id,
  );
  TestValidator.equals(
    "member A dashboard id stable 3",
    dashboardA3.id,
    dashboardA1.id,
  );
  TestValidator.equals(
    "member A dashboard code stable 3",
    dashboardA3.code,
    dashboardA1.code,
  );
  // 4) Indirect activity-log side effect check: repeated calls should not mutate observable fields
  TestValidator.equals(
    "dashboardA1 vs dashboardA3 deleted_at stable",
    dashboardA3.deleted_at,
    dashboardA1.deleted_at,
  );
  TestValidator.equals(
    "dashboardA1 vs dashboardA3 is_active stable",
    dashboardA3.is_active,
    dashboardA1.is_active,
  );
  TestValidator.equals(
    "dashboardA1 vs dashboardA3 created_at stable",
    dashboardA3.created_at,
    dashboardA1.created_at,
  );
  // 5) Cross-organization isolation: member B should not observe member A org-scoped data
  const dashboardB =
    await api.functional.erpHrmTimeTracking.member.personalDashboard.at(
      memberBConnection,
    );
  typia.assert(dashboardB);
  TestValidator.notEquals(
    "member B must not see member A organization_id",
    dashboardB.organization_id,
    dashboardA1.organization_id,
  );
  TestValidator.notEquals(
    "member B should not see member A report id",
    dashboardB.id,
    dashboardA1.id,
  );
}
