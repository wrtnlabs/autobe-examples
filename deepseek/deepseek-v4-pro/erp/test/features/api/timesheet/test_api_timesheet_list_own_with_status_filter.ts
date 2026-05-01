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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimesheet";
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
 * Test listing own timesheets filtered by draft status.
 *
 * Validates that an employee can filter their timesheet listing by workflow status, receiving only timesheets matching the specified status. The test creates a single draft timesheet for the current calendar week, then queries the listing endpoint with status='draft' to confirm the filtering behavior.
 *
 * Key validations include pagination metadata correctness, the presence of the created timesheet in the filtered results, accurate status and date fields on the summary response, a computed total_hours of zero when no timelogs have been added, and the absence of submitted_at for a draft timesheet. The employee summary must reference the authenticated member, confirming proper ownership scoping.
 *
 * 1. Authenticate as a new member via join utility, obtaining JWT tokens and member identity.
 * 2. Compute the Monday of the current calendar week as the week_start_date for the draft timesheet.
 * 3. Create a draft timesheet for the current week using the generation utility.
 * 4. List timesheets filtered by status='draft' via the index endpoint.
 * 5. Validate pagination metadata (current, records, pages are all non-negative).
 * 6. Confirm the created timesheet appears in the filtered results with correct draft status, matching dates, zero total_hours, null submitted_at, and the authenticated member as the owning employee.
 * 7. Ensure all returned timesheets belong to the authenticated employee and have draft status.
 */
export async function test_api_timesheet_list_own_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Compute Monday of the current week (2026-05-01 is Friday → Monday is 2026-04-27)
  const now = new Date("2026-05-01T06:22:45.001Z");
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // 3. Create a draft timesheet for the current week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 4. List timesheets filtered by status="draft"
  const response = await api.functional.erpHrm.member.timesheets.index(
    memberConnection,
    {
      body: {
        status: ["draft"],
      } satisfies IErpHrmTimesheet.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    response.pagination.pages >= 1,
  );
  // 6. Find the created timesheet in the filtered results
  const ourTimesheet = response.data.find((t) => t.id === timesheet.id);
  TestValidator.predicate(
    "created timesheet found in filtered results",
    ourTimesheet !== undefined,
  );
  if (ourTimesheet) {
    TestValidator.equals("status is draft", ourTimesheet.status, "draft");
    TestValidator.equals(
      "week_start_date matches created value",
      ourTimesheet.week_start_date,
      timesheet.week_start_date,
    );
    TestValidator.equals(
      "week_end_date matches created value",
      ourTimesheet.week_end_date,
      timesheet.week_end_date,
    );
    TestValidator.equals(
      "total_hours is zero for empty draft",
      ourTimesheet.total_hours,
      0,
    );
    TestValidator.equals(
      "submitted_at is null for draft",
      ourTimesheet.submitted_at,
      null,
    );
    TestValidator.equals(
      "employee member id matches authenticated member",
      ourTimesheet.employee.member.id,
      member.id,
    );
  }
  // 7. All returned timesheets must be draft and belong to this employee
  for (const ts of response.data) {
    TestValidator.equals(
      "every timesheet has draft status",
      ts.status,
      "draft",
    );
    TestValidator.equals(
      "every timesheet belongs to authenticated member",
      ts.employee.member.id,
      member.id,
    );
  }
}
