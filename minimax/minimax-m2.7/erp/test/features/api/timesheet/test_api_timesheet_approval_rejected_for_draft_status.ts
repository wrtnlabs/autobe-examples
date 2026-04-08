import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that approval fails when timesheet is still in draft status (not yet submitted).
 *
 * 1. Authenticate as admin using POST /erpHrm/auth/admin/join
 * 2. Create a draft timesheet via POST /erpHrm/member/timesheets
 * 3. Create timelog entries via POST /erpHrm/member/timelogs
 * 4. Do NOT submit the timesheet - keep it in draft status
 * 5. Attempt to approve the draft timesheet via POST /erpHrm/admin/timesheets/{timesheetId}/approve
 * 6. Validate response: returns 409 Conflict error indicating invalid state transition (timesheet must be in 'submitted' status to be approved)
 * 7. Verify timesheet remains in 'draft' status
 */
export async function test_api_timesheet_approval_rejected_for_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // Generate passwords upfront
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const memberPassword = RandomGenerator.alphaNumeric(16);
  // 1. Admin creates account with time:approve permission
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member creates account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create a new connection for member login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: member.email,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create timelog entries for the member
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberLoginConnection,
    {},
  );
  typia.assert(timelog);
  // 4. Create a draft timesheet (automatically includes timelogs from that week)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberLoginConnection,
    {},
  );
  typia.assert(timesheet);
  // Verify the timesheet is in draft status
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 5. Attempt to approve the draft timesheet (should fail with 409)
  await TestValidator.httpError(
    "approve draft timesheet fails with 409",
    409,
    async () => {
      await api.functional.erpHrm.admin.timesheets.approve(adminConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
  // 6. Verify timesheet remains in draft status
  TestValidator.equals(
    "timesheet still in draft after failed approval",
    timesheet.status,
    "draft",
  );
}
