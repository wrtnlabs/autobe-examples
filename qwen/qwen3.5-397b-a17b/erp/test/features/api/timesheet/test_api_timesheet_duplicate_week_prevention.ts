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

/**
 * Test business rule preventing duplicate timesheets for the same employee and week.
 *
 * This test validates that the system enforces the unique constraint on employee_id
 * and week_start_date, ensuring each employee can have only one timesheet per week.
 *
 * Test Flow:
 * 1. Authenticate as a new member
 * 2. Create employee record for the member
 * 3. Create first timesheet for a specific week (should succeed)
 * 4. Attempt to create second timesheet for same week (should fail with conflict)
 */
export async function test_api_timesheet_duplicate_week_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create employee record for the member
  const employee = await generate_random_hrm_platform_member_employees_create(
    memberConnection,
    {
      body: {
        member_id: authResult.member.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create first timesheet for a specific week (Monday 2024-01-08)
  const weekStartDate = new Date("2024-01-08T00:00:00.000Z").toISOString();
  const firstTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(firstTimesheet);
  // 4. Attempt to create second timesheet for same week (should fail)
  await TestValidator.error("duplicate timesheet for same week", async () => {
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate,
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  });
}