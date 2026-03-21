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

export async function test_api_timesheet_deletion_prevented_when_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {},
  );
  typia.assert(timesheet);
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  // 3. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 4. Verify the timesheet status changed to 'submitted'
  TestValidator.equals(
    "status changed to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null,
  );
  // 5. Attempt to delete the submitted timesheet - should fail with 400 error
  await TestValidator.httpError(
    "cannot delete submitted timesheet",
    400,
    async () =>
      await api.functional.erpHrm.member.timesheets.erase(memberConnection, {
        timesheetId: timesheet.id,
      }),
  );
  // 6. Verify the timesheet remains accessible and intact (status still 'submitted')
  // The timesheet should still exist and be in submitted status
  TestValidator.equals(
    "timesheet status still submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "timesheet still has submitted_at",
    submittedTimesheet.submitted_at !== null,
  );
}
