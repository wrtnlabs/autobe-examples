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

export async function test_api_member_dashboard_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Verify dashboard can be retrieved successfully
  const dashboard =
    await api.functional.hrmTracker.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // Validate overview section
  TestValidator.equals(
    "employee count >= 0",
    dashboard.overview.employeeCount >= 0,
    true,
  );
  TestValidator.equals(
    "projectStats.total >= 0",
    dashboard.overview.projectStats.total >= 0,
    true,
  );
  TestValidator.equals(
    "projectStats.active >= 0",
    dashboard.overview.projectStats.active >= 0,
    true,
  );
  TestValidator.equals(
    "projectStats.completed >= 0",
    dashboard.overview.projectStats.completed >= 0,
    true,
  );
  TestValidator.equals(
    "projectStats.archived >= 0",
    dashboard.overview.projectStats.archived >= 0,
    true,
  );
  TestValidator.equals(
    "timesheetSummary.submitted >= 0",
    dashboard.overview.timesheetSummary.submitted >= 0,
    true,
  );
  TestValidator.equals(
    "timesheetSummary.pending >= 0",
    dashboard.overview.timesheetSummary.pending >= 0,
    true,
  );
  TestValidator.equals(
    "timesheetSummary.overdue >= 0",
    dashboard.overview.timesheetSummary.overdue >= 0,
    true,
  );
  TestValidator.predicate(
    "recentActivities <= 10 items",
    dashboard.overview.recentActivities.length <= 10,
  );
  // Validate pending invitations (up to 10)
  TestValidator.predicate(
    "pendingInvitations <= 10 items",
    dashboard.pendingInvitations.length <= 10,
  );
  // Validate activity logs
  TestValidator.predicate(
    "recentActivity has items",
    dashboard.recentActivity.length > 0,
  );
  // Validate current timelogs (up to 10)
  TestValidator.predicate(
    "currentTimelog <= 10 items",
    dashboard.currentTimelog.length <= 10,
  );
  // Verify organization context is included in dashboard
  if (dashboard.currentTimelog.length > 0) {
    TestValidator.equals(
      "timelog has organization",
      dashboard.currentTimelog[0].organization.id !== undefined,
      true,
    );
  }
}
