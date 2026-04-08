import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDashboard";
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
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test personal dashboard metrics endpoint for authenticated member.
 *
 * Validates the dashboard API endpoint structure and response format for an authenticated employee.
 * The test registers a new member account, authenticates, and calls the dashboard endpoint.
 * Full metric validation (hoursLoggedToday, hoursLoggedThisWeek, activeTimer, recentTimelogs,
 * pendingTimesheet, assignedTasks) requires additional resource creation endpoints that are
 * not currently available in the SDK. This test verifies the endpoint is accessible and
 * returns properly structured data.
 *
 * 1. Register member account with organization via authorize_member_join utility.
 * 2. Authenticate with returned access token by setting Authorization header.
 * 3. Call GET /hrmPlatform/member/dashboard endpoint.
 * 4. Validate response structure matches IHrmPlatformDashboard type.
 * 5. Validate all required fields exist with correct types.
 */
export async function test_api_member_dashboard_complete_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(joinConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
    },
  });
  typia.assert(joinOutput);
  // 2. Call dashboard endpoint
  const dashboardConnection: api.IConnection = { host: connection.host };
  dashboardConnection.headers = { Authorization: joinOutput.token.access };
  const dashboard =
    await api.functional.hrmPlatform.member.dashboard.at(dashboardConnection);
  typia.assert(dashboard);
  // 3. Validate response structure
  TestValidator.equals(
    "hoursLoggedToday type",
    typeof dashboard.hoursLoggedToday,
    "number",
  );
  TestValidator.equals(
    "hoursLoggedThisWeek type",
    typeof dashboard.hoursLoggedThisWeek,
    "number",
  );
  TestValidator.equals(
    "recentTimelogs type",
    Array.isArray(dashboard.recentTimelogs),
    true,
  );
  TestValidator.equals(
    "assignedTasks type",
    Array.isArray(dashboard.assignedTasks),
    true,
  );
  TestValidator.predicate(
    "activeTimer is null or has id",
    dashboard.activeTimer === null ||
      typeof dashboard.activeTimer?.id === "string",
  );
  TestValidator.predicate(
    "pendingTimesheet is null or has id",
    dashboard.pendingTimesheet === null ||
      typeof dashboard.pendingTimesheet?.id === "string",
  );
  // Note: Full metric validation requires resource creation endpoints (projects, tasks, timelogs, timers, timesheets)
  // which are not available in the current SDK. When those endpoints become available,
  // this test should:
  // - Create test data for each resource type
  // - Assert hoursLoggedToday equals sum of today's timelogs / 60
  // - Assert hoursLoggedThisWeek equals sum of week's timelogs / 60
  // - Assert activeTimer matches started timer details
  // - Assert recentTimelogs returns exactly 5 entries ordered by created_at DESC
  // - Assert pendingTimesheet returns current week timesheet
  // - Assert assignedTasks returns all TODO/IN_PROGRESS tasks
}