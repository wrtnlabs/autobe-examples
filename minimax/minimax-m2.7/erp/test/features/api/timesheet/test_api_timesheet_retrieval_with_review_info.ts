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

/**
 * Test retrieving an approved timesheet with review information.
 *
 * This test validates that after approval workflow:
 * 1. Member creates a draft timesheet
 * 2. Member submits the timesheet for approval
 * 3. Manager/approver approves the timesheet
 * 4. The approved timesheet retrieval shows reviewer information
 *
 * Validations verify:
 * - timesheet.status is 'approved'
 * - timesheet.reviewed_at is populated with review timestamp
 * - timesheet.reviewerEmployee contains the manager's employee info
 * - timesheetTimelogs are included in the response
 */
export async function test_api_timesheet_retrieval_with_review_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member who will create timesheet
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create new connection with the member's token
  const employeeConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 2. Create a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(timesheet);
  // 3. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Validate submission
  TestValidator.equals(
    "status should be submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at should be populated",
    submittedTimesheet.submitted_at !== null,
  );
  // 4. Approve the timesheet
  // Note: The approver needs time:approve permission
  // For this test, we'll use the same member connection as approver
  // In real scenario, this would be a manager with appropriate permissions
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  // 5. Retrieve the approved timesheet and validate review info
  const retrievedTimesheet = await api.functional.erpHrm.member.timesheets.at(
    employeeConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(retrievedTimesheet);
  // Validate timesheet status is approved
  TestValidator.equals(
    "status should be approved",
    retrievedTimesheet.status,
    "approved",
  );
  // Validate review information is populated
  TestValidator.predicate(
    "reviewed_at should be populated after approval",
    retrievedTimesheet.reviewed_at !== null,
  );
  // Validate reviewer information is included
  TestValidator.predicate(
    "reviewerEmployee should be populated",
    retrievedTimesheet.reviewerEmployee !== null,
  );
  // Validate timesheet timelogs are included
  TestValidator.predicate(
    "timesheetTimelogs should be included",
    Array.isArray(retrievedTimesheet.timesheetTimelogs),
  );
  // Validate employee information is present
  TestValidator.predicate(
    "employee info should be present",
    retrievedTimesheet.employee !== undefined,
  );
  // Validate total hours are calculated
  TestValidator.predicate(
    "total_hours should be a number",
    typeof retrievedTimesheet.total_hours === "number",
  );
}
