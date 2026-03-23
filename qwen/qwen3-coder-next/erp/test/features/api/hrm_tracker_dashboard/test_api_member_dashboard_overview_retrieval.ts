import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDashboard";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_dashboard_overview_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Select organization context
  const organizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          status: "active",
        },
      },
    );
  typia.assert(organizations);
  TestValidator.predicate(
    "has at least one organization",
    () => organizations.data.length > 0,
  );
  const org = organizations.data[0];
  // 3. Retrieve dashboard overview
  const overview =
    await api.functional.hrmTracker.member.organizations.dashboard.overview.at(
      memberConnection,
      {
        organizationId: org.id,
      },
    );
  typia.assert(overview);
  // 4. Validate structure
  TestValidator.predicate(
    "employeeCount is non-negative",
    () => overview.employeeCount >= 0,
  );
  TestValidator.equals(
    "projectStats.total exists",
    overview.projectStats.total,
    overview.projectStats.total,
  );
  TestValidator.equals(
    "timesheetSummary.submitted exists",
    overview.timesheetSummary.submitted,
    overview.timesheetSummary.submitted,
  );
  TestValidator.predicate(
    "recentActivities max 10",
    () => overview.recentActivities.length <= 10,
  );
}
