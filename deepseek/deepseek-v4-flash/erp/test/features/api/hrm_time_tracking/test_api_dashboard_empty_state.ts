import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDashboard";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Organization creation — member becomes Owner with report:view permission
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Dashboard retrieval
  const dashboard =
    await api.functional.hrmTimeTracking.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // ── Personal dashboard — empty state validation ──
  TestValidator.equals("today_hours is 0", dashboard.today_hours, 0);
  TestValidator.equals("week_hours is 0", dashboard.week_hours, 0);
  TestValidator.equals("active_timer is null", dashboard.active_timer, null);
  TestValidator.equals(
    "recent_timelogs is empty",
    dashboard.recent_timelogs,
    [],
  );
  TestValidator.equals(
    "pending_timesheet is null",
    dashboard.pending_timesheet,
    null,
  );
  TestValidator.equals("assigned_tasks is empty", dashboard.assigned_tasks, []);
  // ── Organization section (Owner role has report:view permission) ──
  if (dashboard.organization) {
    TestValidator.predicate(
      "total_active_employees >= 1",
      dashboard.organization.total_active_employees >= 1,
    );
    TestValidator.equals(
      "total_week_hours is 0",
      dashboard.organization.total_week_hours,
      0,
    );
    TestValidator.equals(
      "pending_timesheet_count is 0",
      dashboard.organization.pending_timesheet_count,
      0,
    );
    TestValidator.equals(
      "budget_alerts is empty",
      dashboard.organization.budget_alerts,
      [],
    );
  }
}
