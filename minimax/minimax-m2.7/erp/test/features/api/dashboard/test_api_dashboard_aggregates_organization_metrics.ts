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

export async function test_api_dashboard_aggregates_organization_metrics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member via join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Create authenticated connection with the member's token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve dashboard and verify aggregation logic
  const dashboard = await api.functional.erpHrm.member.dashboard.at(
    authenticatedConnection,
  );
  typia.assert(dashboard);
  // 3. Validate dashboard response structure
  // All four main sections must be present
  TestValidator.predicate(
    "activeTimers is array",
    Array.isArray(dashboard.activeTimers),
  );
  TestValidator.predicate(
    "projectSummary exists",
    dashboard.projectSummary !== null && dashboard.projectSummary !== undefined,
  );
  TestValidator.predicate(
    "taskOverview exists",
    dashboard.taskOverview !== null && dashboard.taskOverview !== undefined,
  );
  TestValidator.predicate(
    "recentActivity exists",
    dashboard.recentActivity !== null && dashboard.recentActivity !== undefined,
  );
  // 4. Validate project summary structure and business logic
  TestValidator.predicate(
    "projectSummary has active count",
    "active" in dashboard.projectSummary,
  );
  TestValidator.predicate(
    "projectSummary has archived count",
    "archived" in dashboard.projectSummary,
  );
  TestValidator.predicate(
    "projectSummary has completed count",
    "completed" in dashboard.projectSummary,
  );
  // All project counts must be non-negative integers
  TestValidator.predicate(
    "active projects count is non-negative",
    dashboard.projectSummary.active >= 0,
  );
  TestValidator.predicate(
    "archived projects count is non-negative",
    dashboard.projectSummary.archived >= 0,
  );
  TestValidator.predicate(
    "completed projects count is non-negative",
    dashboard.projectSummary.completed >= 0,
  );
  // 5. Validate task overview structure and business logic
  TestValidator.predicate(
    "taskOverview has byStatus",
    dashboard.taskOverview.byStatus !== null &&
      dashboard.taskOverview.byStatus !== undefined,
  );
  TestValidator.predicate(
    "taskOverview has byPriority",
    dashboard.taskOverview.byPriority !== null &&
      dashboard.taskOverview.byPriority !== undefined,
  );
  // Status counts
  TestValidator.predicate(
    "taskOverview has status counts",
    "open" in dashboard.taskOverview.byStatus,
  );
  TestValidator.predicate(
    "taskOverview has inProgress status",
    "inProgress" in dashboard.taskOverview.byStatus,
  );
  TestValidator.predicate(
    "taskOverview has completed status",
    "completed" in dashboard.taskOverview.byStatus,
  );
  TestValidator.predicate(
    "taskOverview has closed status",
    "closed" in dashboard.taskOverview.byStatus,
  );
  // Priority counts
  TestValidator.predicate(
    "taskOverview has priority counts",
    "low" in dashboard.taskOverview.byPriority,
  );
  TestValidator.predicate(
    "taskOverview has medium priority",
    "medium" in dashboard.taskOverview.byPriority,
  );
  TestValidator.predicate(
    "taskOverview has high priority",
    "high" in dashboard.taskOverview.byPriority,
  );
  TestValidator.predicate(
    "taskOverview has urgent priority",
    "urgent" in dashboard.taskOverview.byPriority,
  );
  // All task counts must be non-negative integers
  TestValidator.predicate(
    "open tasks count is non-negative",
    dashboard.taskOverview.byStatus.open >= 0,
  );
  TestValidator.predicate(
    "inProgress tasks count is non-negative",
    dashboard.taskOverview.byStatus.inProgress >= 0,
  );
  TestValidator.predicate(
    "completed tasks count is non-negative",
    dashboard.taskOverview.byStatus.completed >= 0,
  );
  TestValidator.predicate(
    "closed tasks count is non-negative",
    dashboard.taskOverview.byStatus.closed >= 0,
  );
  TestValidator.predicate(
    "low priority count is non-negative",
    dashboard.taskOverview.byPriority.low >= 0,
  );
  TestValidator.predicate(
    "medium priority count is non-negative",
    dashboard.taskOverview.byPriority.medium >= 0,
  );
  TestValidator.predicate(
    "high priority count is non-negative",
    dashboard.taskOverview.byPriority.high >= 0,
  );
  TestValidator.predicate(
    "urgent priority count is non-negative",
    dashboard.taskOverview.byPriority.urgent >= 0,
  );
  // 6. Validate recent activity structure
  TestValidator.predicate(
    "recentActivity has timelogsCount",
    "timelogsCount" in dashboard.recentActivity,
  );
  TestValidator.predicate(
    "recentActivity has totalHoursThisWeek",
    "totalHoursThisWeek" in dashboard.recentActivity,
  );
  // Recent activity counts must be non-negative
  TestValidator.predicate(
    "timelogsCount is non-negative",
    dashboard.recentActivity.timelogsCount >= 0,
  );
  TestValidator.predicate(
    "totalHoursThisWeek is non-negative",
    dashboard.recentActivity.totalHoursThisWeek >= 0,
  );
}
