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

export async function test_api_timesheet_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  // Step 2: Create a draft timesheet for the authenticated employee
  const timesheet: IErpHrmTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(
      memberConnection,
      {},
    );
  typia.assert(timesheet);
  // Step 3: Retrieve the timesheet using GET /erpHrm/member/timesheets/{timesheetId}
  const retrievedTimesheet: IErpHrmTimesheet =
    await api.functional.erpHrm.member.timesheets.at(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // Validations
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "employee ID matches authenticated employee",
    retrievedTimesheet.employee.id,
    authorized.id,
  );
  TestValidator.equals("status is draft", retrievedTimesheet.status, "draft");
  TestValidator.equals(
    "submitted_at is null",
    retrievedTimesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null",
    retrievedTimesheet.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewerEmployee is null",
    retrievedTimesheet.reviewerEmployee,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrievedTimesheet.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "timesheetTimelogs is array",
    Array.isArray(retrievedTimesheet.timesheetTimelogs),
  );
}
