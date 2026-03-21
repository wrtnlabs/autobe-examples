import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmPersonalDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPersonalDashboard";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the personal dashboard endpoint for a newly onboarded employee with no
 * time tracking activity.
 *
 * This test verifies that the dashboard correctly handles empty states when a
 * newly registered employee views their dashboard for the first time. All
 * fields should return appropriate empty/zero/null values without errors.
 */
export async function test_api_personal_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a new member to ensure clean empty state
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Fetch personal dashboard
  const dashboard: IErpHrmPersonalDashboard =
    await api.functional.erpHrm.member.dashboards.personal.at(memberConnection);
  typia.assert(dashboard);
  // Validate empty state values
  TestValidator.equals("hoursToday should be 0", dashboard.hoursToday, 0);
  TestValidator.equals("hoursThisWeek should be 0", dashboard.hoursThisWeek, 0);
  TestValidator.equals(
    "activeTimer should be null",
    dashboard.activeTimer,
    null,
  );
  TestValidator.equals(
    "recentTimelogs should be empty array",
    dashboard.recentTimelogs,
    [],
  );
  TestValidator.equals(
    "pendingTimesheet should be null",
    dashboard.pendingTimesheet,
    null,
  );
  TestValidator.equals(
    "assignedTasks should be empty array",
    dashboard.assignedTasks,
    [],
  );
}
