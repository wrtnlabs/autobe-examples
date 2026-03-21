import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving the organization dashboard when no active timers exist in the organization.
 *
 * Prerequisites: Create a new member account via /auth/member/join and authenticate.
 *
 * Steps:
 * 1. Register a new member account via join endpoint
 * 2. Call GET /erpHrm/member/dashboard without any running timers in the organization
 *
 * Validation points:
 * - Response should be 200 OK
 * - activeTimers array must be empty [] when no timers are running
 * - projectSummary should return valid counts (can be zeros for new organizations)
 * - taskOverview.byStatus should contain all status counts (open, inProgress, completed, closed) as integers
 * - taskOverview.byPriority should contain all priority counts (low, medium, high, urgent) as integers
 * - recentActivity should contain valid counts (timelogsCount as 0, totalHoursThisWeek as 0 for new organizations)
 * - All counts must be non-negative integers
 */
export async function test_api_dashboard_empty_state_no_timers(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Validate the authorized response
  typia.assert(authorized);
  // Step 2: Call GET /erpHrm/member/dashboard without any running timers
  const dashboard =
    await api.functional.erpHrm.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // Validation: activeTimers must be empty when no timers are running
  TestValidator.equals(
    "activeTimers should be empty",
    dashboard.activeTimers,
    [],
  );
  // Validation: projectSummary counts must be non-negative integers
  TestValidator.predicate(
    "projectSummary.active is non-negative",
    dashboard.projectSummary.active >= 0,
  );
  TestValidator.predicate(
    "projectSummary.archived is non-negative",
    dashboard.projectSummary.archived >= 0,
  );
  TestValidator.predicate(
    "projectSummary.completed is non-negative",
    dashboard.projectSummary.completed >= 0,
  );
  // Validation: taskOverview.byStatus counts must be non-negative integers
  TestValidator.predicate(
    "taskOverview.byStatus.open is non-negative",
    dashboard.taskOverview.byStatus.open >= 0,
  );
  TestValidator.predicate(
    "taskOverview.byStatus.inProgress is non-negative",
    dashboard.taskOverview.byStatus.inProgress >= 0,
  );
  TestValidator.predicate(
    "taskOverview.byStatus.completed is non-negative",
    dashboard.taskOverview.byStatus.completed >= 0,
  );
  TestValidator.predicate(
    "taskOverview.byStatus.closed is non-negative",
    dashboard.taskOverview.byStatus.closed >= 0,
  );
  // Validation: taskOverview.byPriority counts must be non-negative integers
  TestValidator.predicate(
    "taskOverview.byPriority.low is non-negative",
    dashboard.taskOverview.byPriority.low >= 0,
  );
  TestValidator.predicate(
    "taskOverview.byPriority.medium is non-negative",
    dashboard.taskOverview.byPriority.medium >= 0,
  );
  TestValidator.predicate(
    "taskOverview.byPriority.high is non-negative",
    dashboard.taskOverview.byPriority.high >= 0,
  );
  TestValidator.predicate(
    "taskOverview.byPriority.urgent is non-negative",
    dashboard.taskOverview.byPriority.urgent >= 0,
  );
  // Validation: recentActivity counts must be valid for new organizations
  TestValidator.equals(
    "recentActivity.timelogsCount should be 0 for new organizations",
    dashboard.recentActivity.timelogsCount,
    0,
  );
  TestValidator.equals(
    "recentActivity.totalHoursThisWeek should be 0 for new organizations",
    dashboard.recentActivity.totalHoursThisWeek,
    0,
  );
}
