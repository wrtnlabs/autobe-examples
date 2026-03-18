import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_dashboard_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create new connection with member token
  const dashboardConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...memberConnection.headers,
      Authorization: member.token.access,
    },
  };
  // 3. Call dashboard endpoint (personal dashboard - no report:view permission)
  const dashboard: IHrmsProject =
    await api.functional.hrms.member.dashboard.at(dashboardConnection);
  typia.assert(dashboard);
  // 4. Validate dashboard response for empty data scenario
  TestValidator.equals(
    "dashboard type is personal",
    dashboard.dashboard_type,
    "personal",
  );
  TestValidator.equals(
    "hours today is 0 (no timelogs)",
    dashboard.hours_today ?? 0,
    0,
  );
  TestValidator.equals(
    "hours this week is 0 (no timelogs)",
    dashboard.hours_this_week ?? 0,
    0,
  );
  TestValidator.equals(
    "active timer is null (no running timer)",
    dashboard.active_timer,
    null,
  );
  TestValidator.equals(
    "recent timelogs is empty array (no timelogs)",
    dashboard.recent_timelogs?.length ?? 0,
    0,
  );
  TestValidator.equals(
    "pending timesheets count is 0 (no submitted timesheets)",
    dashboard.pending_timesheets_count ?? 0,
    0,
  );
  TestValidator.equals(
    "assigned tasks is empty array (no assigned tasks)",
    dashboard.assigned_tasks?.length ?? 0,
    0,
  );
  TestValidator.predicate("generation timestamp is present and valid", () => {
    if (!dashboard.generation_timestamp) return false;
    const date = new Date(dashboard.generation_timestamp);
    return !isNaN(date.getTime());
  });
}
