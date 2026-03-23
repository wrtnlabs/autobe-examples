import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import type { IHrmTrackerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDashboard";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerPendingInvitation";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTask";
import type { IHrmTrackerTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_dashboard_empty_invitations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(member);
  // 2. Retrieve the dashboard data
  const dashboard =
    await api.functional.hrmTracker.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 3. Verify that pendingInvitations is an empty array
  TestValidator.equals(
    "pendingInvitations should be empty",
    dashboard.pendingInvitations,
    [],
  );
  // 4. Verify that other dashboard sections still return their aggregated data correctly
  TestValidator.predicate("overview exists", dashboard.overview !== null);
  TestValidator.predicate(
    "overview.employeeCount >= 0",
    dashboard.overview.employeeCount >= 0,
  );
  typia.assert(dashboard.overview);
  TestValidator.predicate(
    "recentActivity exists",
    dashboard.recentActivity !== null,
  );
  TestValidator.predicate(
    "currentTimelog exists",
    dashboard.currentTimelog !== null,
  );
}
