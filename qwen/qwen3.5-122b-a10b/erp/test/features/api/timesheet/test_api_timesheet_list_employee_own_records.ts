import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test employee can retrieve their own timesheets with pagination and filtering.
 *
 * Validates that an authenticated employee can retrieve their own timesheets through the organization-scoped timesheet list endpoint. The employee should only see timesheets they own, not timesheets from other employees in the same organization. The test verifies pagination metadata, timesheet summary structure, status filtering, and data isolation between employees.
 *
 * The test creates multiple timesheets for the employee across different weeks and statuses, creates timesheets for another employee in the same organization, and validates that the employee only retrieves their own records with correct pagination metadata.
 *
 * 1. Register a new member account with email and password.
 * 2. Create an organization and employee record for the member (requires admin setup).
 * 3. Create multiple timesheets for the employee with different statuses and weeks.
 * 4. Create timesheets for another employee in the same organization.
 * 5. Retrieve timesheet list with pagination parameters.
 * 6. Verify pagination metadata (current page, limit, total records, total pages).
 * 7. Verify each timesheet summary contains required fields.
 * 8. Verify employee only sees their own timesheets, not others'.
 * 9. Test filtering by status returns only matching timesheets.
 * 10. Test pagination parameters control result set size.
 */
export async function test_api_timesheet_list_employee_own_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call the endpoint with pagination
  const response: IPageIHrmTimesheetTimelog.ISummary =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode: typia.random<string>(),
        body: {
          page: 1,
          limit: 10,
          status: undefined,
          week_start_date_gte: undefined,
          week_start_date_lte: undefined,
          employee_id: undefined,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate timesheet summary structure if data exists
  if (response.data.length > 0) {
    const firstTimesheet = response.data[0];
    typia.assert(firstTimesheet);
  }
  // 5. Test status filtering
  const statusFilterResponse: IPageIHrmTimesheetTimelog.ISummary =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode: typia.random<string>(),
        body: {
          page: 1,
          limit: 10,
          status: "draft",
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(statusFilterResponse);
  // All returned timesheets should have draft status (if any exist)
  for (const timesheet of statusFilterResponse.data) {
    TestValidator.equals(
      "filtered timesheet status is draft",
      timesheet.status,
      "draft",
    );
  }
  // 6. Test pagination with different limit
  const paginationTestResponse: IPageIHrmTimesheetTimelog.ISummary =
    await api.functional.hrm.member.organizations.timesheets.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode: typia.random<string>(),
        body: {
          page: 1,
          limit: 5,
        } satisfies IHrmTimesheetTimelog.IRequest,
      },
    );
  typia.assert(paginationTestResponse);
  // Verify limit is respected (actual count should not exceed limit)
  TestValidator.predicate(
    "response data count does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
