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

export async function test_api_dashboard_retrieval_with_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection via join endpoint to establish session with organization context
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
  // Create authenticated connection with access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // Call GET /erpHrm/member/dashboard
  const dashboard = await api.functional.erpHrm.member.dashboard.at(
    authenticatedConnection,
  );
  typia.assert(dashboard);
  // Validate dashboard structure
  TestValidator.equals(
    "activeTimers is array",
    Array.isArray(dashboard.activeTimers),
    true,
  );
  TestValidator.equals(
    "projectSummary exists",
    dashboard.projectSummary !== null && dashboard.projectSummary !== undefined,
    true,
  );
  TestValidator.equals(
    "taskOverview exists",
    dashboard.taskOverview !== null && dashboard.taskOverview !== undefined,
    true,
  );
  TestValidator.equals(
    "recentActivity exists",
    dashboard.recentActivity !== null && dashboard.recentActivity !== undefined,
    true,
  );
  // Validate projectSummary structure
  TestValidator.equals(
    "projectSummary.active is number",
    typeof dashboard.projectSummary.active === "number",
    true,
  );
  TestValidator.equals(
    "projectSummary.archived is number",
    typeof dashboard.projectSummary.archived === "number",
    true,
  );
  TestValidator.equals(
    "projectSummary.completed is number",
    typeof dashboard.projectSummary.completed === "number",
    true,
  );
  // Validate taskOverview.byStatus structure
  TestValidator.equals(
    "taskOverview.byStatus.open is number",
    typeof dashboard.taskOverview.byStatus.open === "number",
    true,
  );
  TestValidator.equals(
    "taskOverview.byStatus.inProgress is number",
    typeof dashboard.taskOverview.byStatus.inProgress === "number",
    true,
  );
  TestValidator.equals(
    "taskOverview.byStatus.completed is number",
    typeof dashboard.taskOverview.byStatus.completed === "number",
    true,
  );
  TestValidator.equals(
    "taskOverview.byStatus.closed is number",
    typeof dashboard.taskOverview.byStatus.closed === "number",
    true,
  );
  // Validate taskOverview.byPriority structure
  TestValidator.equals(
    "taskOverview.byPriority.low is number",
    typeof dashboard.taskOverview.byPriority.low === "number",
    true,
  );
  TestValidator.equals(
    "taskOverview.byPriority.medium is number",
    typeof dashboard.taskOverview.byPriority.medium === "number",
    true,
  );
  TestValidator.equals(
    "taskOverview.byPriority.high is number",
    typeof dashboard.taskOverview.byPriority.high === "number",
    true,
  );
  TestValidator.equals(
    "taskOverview.byPriority.urgent is number",
    typeof dashboard.taskOverview.byPriority.urgent === "number",
    true,
  );
  // Validate recentActivity structure
  TestValidator.equals(
    "recentActivity.timelogsCount is number",
    typeof dashboard.recentActivity.timelogsCount === "number",
    true,
  );
  TestValidator.equals(
    "recentActivity.totalHoursThisWeek is number",
    typeof dashboard.recentActivity.totalHoursThisWeek === "number",
    true,
  );
  // Validate timer structure if timers exist
  for (const timer of dashboard.activeTimers) {
    TestValidator.equals(
      "timer.id is uuid",
      typeof timer.id === "string",
      true,
    );
    TestValidator.equals(
      "timer.startedAt is date-time",
      typeof timer.startedAt === "string",
      true,
    );
    TestValidator.equals(
      "timer.project exists",
      timer.project !== null && timer.project !== undefined,
      true,
    );
    TestValidator.equals(
      "timer.project.name is string",
      typeof timer.project.name === "string",
      true,
    );
    TestValidator.equals(
      "timer.project.color is string",
      typeof timer.project.color === "string",
      true,
    );
  }
}
