import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_creation_draft_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create employee record for the authenticated member
  // This establishes organizational membership required for timesheet operations
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: memberAuth.id,
        employment_type: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 3. Create a draft timesheet with Monday as week_start_date
  // Use a specific Monday date for predictable testing
  const monday = new Date("2024-01-08T00:00:00.000Z"); // A known Monday
  const weekStartDate = monday.toISOString();
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 4. Validate timesheet properties
  // Status should be 'draft' for newly created timesheet
  TestValidator.equals("timesheet status", timesheet.status, "draft");
  // week_start_date should match input
  TestValidator.equals(
    "week start date",
    timesheet.week_start_date,
    weekStartDate,
  );
  // week_end_date should be week_start_date + 6 days (Sunday)
  const expectedEndDate = new Date(monday);
  expectedEndDate.setDate(expectedEndDate.getDate() + 6);
  const expectedWeekEndDate = expectedEndDate.toISOString();
  TestValidator.equals(
    "week end date",
    timesheet.week_end_date,
    expectedWeekEndDate,
  );
  // submitted_at should be null for draft status
  TestValidator.equals("submitted_at is null", timesheet.submitted_at, null);
  // reviewed_at should be null for draft status
  TestValidator.equals("reviewed_at is null", timesheet.reviewed_at, null);
  // rejection_reason should be null for draft status
  TestValidator.equals(
    "rejection_reason is null",
    timesheet.rejection_reason,
    null,
  );
  // timelogs should be empty array for newly created draft
  TestValidator.equals("timelogs is empty", timesheet.timelogs.length, 0);
  // Employee ownership should match the created employee
  TestValidator.equals(
    "employee id matches",
    timesheet.employee.id,
    employee.id,
  );
  // Validate employee display name matches
  TestValidator.equals(
    "employee display name",
    timesheet.employee.display_name,
    employee.display_name,
  );
}
