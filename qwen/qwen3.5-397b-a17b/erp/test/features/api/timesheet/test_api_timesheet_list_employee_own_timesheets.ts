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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimesheet";
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
 * Test that an authenticated employee can successfully retrieve their own timesheets.
 * 1. Member joins the platform
 * 2. Employee record is created for the member
 * 3. Multiple timesheets are created across different weeks (all in draft status)
 * 4. Another employee is created to ensure data isolation
 * 5. Employee retrieves their timesheet list
 * 6. Validate response contains only own timesheets, sorted by week_start_date descending, with proper pagination
 */
export async function test_api_timesheet_list_employee_own_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
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
        member_id: authResult.id,
        employment_type: "full-time",
        role_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IHrmPlatformEmployee.ICreate,
    },
  );
  typia.assert(employee);
  // 3. Create multiple timesheets across different weeks
  const now = new Date();
  const week1Start = new Date(now);
  week1Start.setDate(now.getDate() - now.getDay() + 1 - 7); // Monday of last week
  week1Start.setHours(0, 0, 0, 0);
  const week2Start = new Date(week1Start);
  week2Start.setDate(week1Start.getDate() - 7); // Monday of two weeks ago
  const week3Start = new Date(week2Start);
  week3Start.setDate(week2Start.getDate() - 7); // Monday of three weeks ago
  const timesheet1 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week1Start.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet1);
  const timesheet2 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week2Start.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet2);
  const timesheet3 =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: week3Start.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(timesheet3);
  // 4. Create another employee in the same organization to test data isolation
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherAuthResult = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(otherAuthResult);
  const otherEmployee =
    await generate_random_hrm_platform_member_employees_create(
      otherMemberConnection,
      {
        body: {
          member_id: otherAuthResult.id,
          employment_type: "part-time",
          role_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IHrmPlatformEmployee.ICreate,
      },
    );
  typia.assert(otherEmployee);
  // Create a timesheet for the other employee
  const otherTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      otherMemberConnection,
      {
        body: {
          week_start_date: week1Start.toISOString(),
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(otherTimesheet);
  // 5. Retrieve timesheet list for the first employee
  const timesheetList =
    await api.functional.hrmPlatform.member.timesheets.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IHrmPlatformTimesheet.IRequest,
    });
  typia.assert(timesheetList);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "has pagination",
    timesheetList.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    timesheetList.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", timesheetList.pagination.limit === 20);
  TestValidator.predicate(
    "has at least 3 timesheets",
    timesheetList.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    timesheetList.pagination.pages >= 1,
  );
  // 7. Validate timesheet data exists
  TestValidator.predicate("has timesheet data", timesheetList.data.length >= 3);
  // 8. Validate all timesheets belong to the current employee (data isolation)
  for (const timesheet of timesheetList.data) {
    TestValidator.equals(
      "timesheet belongs to current employee",
      timesheet.employee.id,
      employee.id,
    );
  }
  // 9. Validate timesheets are sorted by week_start_date descending
  for (let i = 0; i < timesheetList.data.length - 1; i++) {
    const current = new Date(timesheetList.data[i].week_start_date).getTime();
    const next = new Date(timesheetList.data[i + 1].week_start_date).getTime();
    TestValidator.predicate(
      `sorted descending: index ${i} >= ${i + 1}`,
      current >= next,
    );
  }
}