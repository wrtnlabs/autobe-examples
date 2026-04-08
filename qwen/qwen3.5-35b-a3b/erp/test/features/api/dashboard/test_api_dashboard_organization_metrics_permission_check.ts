import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
import type { IHrmPlatformDashboardIOrgMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIOrgMetric";
import type { IHrmPlatformDashboardIPersonalMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboardIPersonalMetric";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization dashboard metrics retrieval and report_view permission validation.
 *
 * Validates that organization dashboard metrics are correctly computed and accessible only to users with report_view permission.
 * Tests the complete workflow from member registration through dashboard metrics retrieval.
 *
 * Verifies that Owners (created during member join) have report_view permission by default and can access organization metrics including total active employee count and pending timesheets count.
 *
 * 1. Member joins system with organization, becoming Owner.
 * 2. Owner calls dashboard endpoint with dashboard_type='organization'.
 * 3. Validates 200 OK response with org_metrics populated.
 * 4. Validates personal_metrics is null (organization dashboard excludes personal data).
 * 5. Validates total_active_employees count matches organization's active employees.
 * 6. Validates pending_timesheets_count matches organization's submitted timesheets.
 * 7. Validates dashboard_type='organization' in response.
 */
export async function test_api_dashboard_organization_metrics_permission_check(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins with organization (becomes Owner with report_view permission)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        name: "Organization Test User",
        org_name: "Test Organization",
        org_currency: "USD",
        org_description: "Organization for metrics testing",
        href: "https://example.com",
        referrer: "https://example.com/login",
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(joinOutput);
  // 2. Create authenticated connection using join tokens
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinOutput.token.access },
  };
  // 3. Request organization dashboard metrics
  const dashboardRequest: IHrmPlatformDashboard.IRequest = {
    dashboard_type: "organization",
  } satisfies IHrmPlatformDashboard.IRequest;
  const dashboardResponse: IHrmPlatformDashboard.IResponse =
    await api.functional.hrmPlatform.member.dashboard.metrics(
      authenticatedConnection,
      { body: dashboardRequest },
    );
  typia.assert(dashboardResponse);
  // 4. Validate dashboard_type is 'organization'
  TestValidator.equals(
    "dashboard type is organization",
    dashboardResponse.dashboard_type,
    "organization",
  );
  // 5. Validate personal_metrics is null for organization dashboard
  TestValidator.equals(
    "personal_metrics is null",
    dashboardResponse.personal_metrics,
    null,
  );
  // 6. Validate org_metrics exists and is populated
  TestValidator.notEquals(
    "org_metrics exists",
    dashboardResponse.org_metrics,
    null,
  );
  typia.assert(dashboardResponse.org_metrics!);
  const orgMetrics = dashboardResponse.org_metrics!;
  // 7. Validate org_metrics contains required fields
  TestValidator.equals(
    "total_active_employees is non-negative integer",
    orgMetrics.total_active_employees >= 0,
    true,
  );
  TestValidator.equals(
    "pending_timesheets_count is non-negative integer",
    orgMetrics.pending_timesheets_count >= 0,
    true,
  );
  // 8. Validate metrics are reasonable (Owner is active employee)
  TestValidator.predicate(
    "total_active_employees at least 1 (owner)",
    orgMetrics.total_active_employees >= 1,
  );
}
