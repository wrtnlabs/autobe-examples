import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
 * Test timesheet detail retrieval by employee owner.
 *
 * An authenticated employee creates a draft timesheet for a specific work week
 * and then retrieves the complete timesheet details. This validates that
 * employees can successfully view their own timesheet information including
 * the weekly period, status, total hours, and timelog entries.
 */
export async function test_api_timesheet_detail_employee_owner_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a draft timesheet for a work week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Retrieve the timesheet details by ID
  const retrieved = await api.functional.erpHrm.member.timesheets.at(
    memberConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate the retrieved timesheet matches the created one
  TestValidator.equals("timesheet id", retrieved.id, timesheet.id);
  TestValidator.equals("status is draft", retrieved.status, "draft");
  TestValidator.equals("submitted_at is null", retrieved.submitted_at, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals(
    "rejection_reason is null",
    retrieved.rejection_reason,
    null,
  );
  TestValidator.equals(
    "week_start_date matches",
    retrieved.week_start_date,
    timesheet.week_start_date,
  );
  TestValidator.equals(
    "week_end_date matches",
    retrieved.week_end_date,
    timesheet.week_end_date,
  );
  TestValidator.equals(
    "total_hours matches",
    retrieved.total_hours,
    timesheet.total_hours,
  );
}
