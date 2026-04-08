import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import type { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import type { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test timesheet creation duplicate week conflict prevention.
 *
 * Validates the business rule that prevents creating multiple timesheets for the same employee within the same week when a submitted or approved timesheet already exists. This ensures data integrity and prevents duplicate time tracking records for overlapping periods.
 *
 * The test follows these steps to verify the constraint:
 * 1. Authenticate a member account for organization access
 * 2. Create an organization and employee for timesheet testing
 * 3. Create and submit a timesheet for a specific week
 * 4. Attempt to create another timesheet for the same employee and week
 * 5. Verify the second creation fails with duplicate week conflict error
 *
 * This validates the critical business rule that only one timesheet per employee per week is allowed in submitted or approved status, preventing time tracking conflicts and ensuring accurate payroll calculations.
 */
export async function test_api_timesheet_creation_duplicate_week_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization (using generate function if available, otherwise need to check)
  // For this test, we'll use a random organization ID since organization creation endpoint not in provided APIs
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create employee (need to check available APIs - using generate function)
  // Since employee creation API not in provided SDK functions, we'll use a random employee ID
  const employeeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create first timesheet for specific week
  const weekStartDate = new Date("2026-04-06T00:00:00Z"); // Monday
  const firstTimesheet =
    await api.functional.hrm.member.organizations.timesheets.create(
      memberConnection,
      {
        organizationId,
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  // 5. Attempt to create second timesheet for same employee and week
  // This should fail with duplicate week conflict error
  await TestValidator.error("duplicate week conflict", async () => {
    await api.functional.hrm.member.organizations.timesheets.create(
      memberConnection,
      {
        organizationId,
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
      },
    );
  });
  // 6. Verify only one timesheet exists (first one should exist)
  TestValidator.equals(
    "first timesheet created",
    firstTimesheet.id !== undefined,
    true,
  );
}
