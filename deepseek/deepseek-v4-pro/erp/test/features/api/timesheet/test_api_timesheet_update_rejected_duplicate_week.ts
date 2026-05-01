import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that updating a timesheet's week range to an already-occupied week is rejected with a 409 Conflict.
 *
 * Validates the database-level unique constraint on (employee_id, week_start_date) that prevents an employee from having two timesheets covering the same calendar week. The employee creates two draft timesheets for distinct weeks, then attempts to move one into the other's week.
 *
 * The server must reject the overlapping-week update and both timesheets must preserve their original week boundaries unchanged.
 *
 * 1. Register a new member and authenticate to obtain an employee session.
 * 2. Compute two distinct Monday dates in UTC for Week A and Week B, seven days apart.
 * 3. Create draft timesheet A occupying Week A via the generation utility.
 * 4. Create draft timesheet B occupying Week B via the generation utility.
 * 5. Attempt to update timesheet B's week_start_date to Week A's Monday.
 * 6. Verify the server responds with HTTP 409 Conflict.
 * 7. Verify timesheet A still covers Week A and timesheet B still covers Week B.
 */
export async function test_api_timesheet_update_rejected_duplicate_week(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Compute two distinct Monday dates in UTC
  const now = new Date();
  const utcDay = now.getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  const weekA = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday - 21,
    ),
  );
  const weekB = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceMonday - 14,
    ),
  );
  const weekAStart = weekA.toISOString();
  const weekBStart = weekB.toISOString();
  // 3. Create first draft timesheet for Week A
  const timesheetA = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    { body: { week_start_date: weekAStart } },
  );
  typia.assert(timesheetA);
  // 4. Create second draft timesheet for Week B
  const timesheetB = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    { body: { week_start_date: weekBStart } },
  );
  typia.assert(timesheetB);
  // 5. Attempt to update timesheet B to Week A — expect 409 Conflict
  await TestValidator.httpError(
    "update to duplicate week should return 409",
    409,
    async () => {
      await api.functional.erpHrm.member.timesheets.update(memberConnection, {
        timesheetId: timesheetB.id,
        body: {
          week_start_date: weekAStart,
        } satisfies IErpHrmTimesheet.IUpdate,
      });
    },
  );
  // 6. Verify both timesheets retain their original week ranges
  TestValidator.equals(
    "timesheet A retains week A",
    timesheetA.week_start_date,
    weekAStart,
  );
  TestValidator.equals(
    "timesheet B retains week B",
    timesheetB.week_start_date,
    weekBStart,
  );
}
