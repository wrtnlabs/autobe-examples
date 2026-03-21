import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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

export async function test_api_timesheet_submission_empty_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via POST /erpHrm/auth/member/join
  const authorized: IErpHrmMember.IAuthorized = await authorize_member_join(
    connection,
    {},
  );
  // 2. Create member-specific connection with token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Create a draft timesheet for a specific work week (Monday-Sunday)
  // The timesheet will be created with no timelogs
  const timesheet: IErpHrmTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(
      memberConnection,
      {},
    );
  // Validate the timesheet was created in draft status
  typia.assert(timesheet);
  // Store the initial status to verify it doesn't change after rejection
  const initialStatus = timesheet.status;
  TestValidator.equals("initial status is draft", initialStatus, "draft");
  // Store the initial submitted_at to verify it remains null
  const initialSubmittedAt = timesheet.submitted_at;
  TestValidator.equals("submitted_at is null", initialSubmittedAt, null);
  // 4. Attempt to submit the empty draft timesheet
  // Expected: HTTP 422 Unprocessable Entity with error message
  await TestValidator.httpError(
    "empty timesheet submission should be rejected with 422",
    422,
    async () => {
      await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
}