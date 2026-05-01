import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
 * Validates that the personal dashboard handles the case where an employee has no
 * activity whatsoever — no timelogs logged, no timer running, no timesheet created,
 * and no tasks assigned.
 *
 * This scenario represents a newly onboarded employee who has just joined the
 * organization but has not yet started any work. The dashboard must return
 * gracefully with sensible defaults rather than failing with errors, returning
 * HTTP 200 with zero values for numeric counters, null for nullable objects, and
 * empty arrays for collections.
 *
 * 1. A new member joins the platform, creating a fresh employee record with
 *    no prior activity.
 * 2. The member's personal dashboard is requested via the GET endpoint.
 * 3. hours_today_minutes is validated to be 0.
 * 4. hours_today_decimal_hours is validated to be 0.
 * 5. hours_this_week_minutes is validated to be 0.
 * 6. hours_this_week_decimal_hours is validated to be 0.
 * 7. active_timer is validated to be null (no running timer).
 * 8. recent_timelogs is validated to be an empty array.
 * 9. pending_timesheet is validated to be null (no timesheet for current week).
 * 10. assigned_tasks is validated to be an empty array.
 */
export async function test_api_dashboard_personal_empty_graceful_defaults(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member — creates a fresh employee with no activity
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Request personal dashboard
  const dashboard =
    await api.functional.erpHrm.member.dashboard.personal.at(memberConnection);
  typia.assert(dashboard);
  // 3. Validate all fields return sensible defaults
  TestValidator.equals(
    "hours_today_minutes is 0",
    dashboard.hours_today_minutes,
    0,
  );
  TestValidator.equals(
    "hours_today_decimal_hours is 0",
    dashboard.hours_today_decimal_hours,
    0,
  );
  TestValidator.equals(
    "hours_this_week_minutes is 0",
    dashboard.hours_this_week_minutes,
    0,
  );
  TestValidator.equals(
    "hours_this_week_decimal_hours is 0",
    dashboard.hours_this_week_decimal_hours,
    0,
  );
  TestValidator.equals("active_timer is null", dashboard.active_timer, null);
  TestValidator.predicate(
    "recent_timelogs is empty",
    dashboard.recent_timelogs.length === 0,
  );
  TestValidator.equals(
    "pending_timesheet is null",
    dashboard.pending_timesheet,
    null,
  );
  TestValidator.predicate(
    "assigned_tasks is empty",
    dashboard.assigned_tasks.length === 0,
  );
}
