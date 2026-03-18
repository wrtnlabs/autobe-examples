import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
import type { IHrmTimeTrackingDashboardOrganizationMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardOrganizationMetric";
import type { IHrmTimeTrackingDashboardPendingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPendingTimesheet";
import type { IHrmTimeTrackingDashboardPeriod } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPeriod";
import type { IHrmTimeTrackingDashboardPersonal } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardPersonal";
import type { IHrmTimeTrackingDashboardRecentTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardRecentTimelog";
import type { IHrmTimeTrackingDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardSummary";
import type { IHrmTimeTrackingDashboardTopProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboardTopProject";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimerSession";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IHrmTimeTrackingWeeklySummaryReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingWeeklySummaryReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_report_view_permission_required(
  connection: api.IConnection,
): Promise<void> {
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${joined.token.access}`,
    },
  };
  const dashboard =
    await api.functional.hrmTimeTracking.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  TestValidator.equals(
    "member email should match joined account",
    dashboard.member.email,
    joined.email,
  );
  TestValidator.equals(
    "member id should match joined account",
    dashboard.member.id,
    joined.id,
  );
  TestValidator.equals(
    "dashboard organization must be selected in the active context",
    dashboard.organization.id,
    dashboard.employee.organization.id,
  );
  TestValidator.equals(
    "dashboard organization must match the employee organization",
    dashboard.organization.id,
    dashboard.employee.organization.id,
  );
  TestValidator.predicate(
    "dashboard should include a valid active member context",
    dashboard.member.is_active,
  );
  TestValidator.predicate(
    "dashboard should include organization context",
    dashboard.organization.name.length > 0,
  );
  TestValidator.predicate(
    "dashboard should include employee context",
    dashboard.employee.id.length > 0,
  );
  TestValidator.predicate(
    "dashboard should include personal data",
    dashboard.personal !== null && dashboard.personal !== undefined,
  );
  TestValidator.predicate(
    "dashboard period should be present",
    dashboard.period !== null && dashboard.period !== undefined,
  );
}
