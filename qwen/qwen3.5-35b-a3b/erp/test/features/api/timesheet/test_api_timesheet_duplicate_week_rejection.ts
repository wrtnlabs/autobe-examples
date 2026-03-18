import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimesheet";
import type { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_employees_timelogs_create } from "../../../generate/generate_random_hrms_member_organizations_employees_timelogs_create";
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timelog } from "../../../prepare/prepare_random_hrms_timelog";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_duplicate_week_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://test.local/signup",
      referrer: "https://test.local",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // Extract organization and employee IDs from membership
  const orgMembership = memberAuth.organization_memberships[0];
  const organizationId = orgMembership.organization.id;
  const employeeId = orgMembership.member.id;
  TestValidator.predicate(
    "has organization membership",
    orgMembership !== undefined && orgMembership !== null,
  );
  // 2. Calculate week start date (Monday at midnight)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  TestValidator.predicate(
    "week start date is valid",
    weekStartDate.length > 0 && weekStartDate.includes("T"),
  );
  // 3. Create first timesheet for week A
  const firstTimesheet = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(firstTimesheet);
  TestValidator.equals(
    "first timesheet is draft",
    firstTimesheet.status,
    "draft",
  );
  // 4. Submit first timesheet
  const submittedFirstTimesheet =
    await api.functional.hrms.member.timesheets.submit(memberConnection, {
      timesheetId: firstTimesheet.id,
    });
  typia.assert(submittedFirstTimesheet);
  TestValidator.equals(
    "first timesheet status is submitted",
    submittedFirstTimesheet.status,
    "submitted",
  );
  // 5. Create second timesheet for SAME week A (should succeed as draft)
  const secondTimesheet = await api.functional.hrms.member.timesheets.create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(secondTimesheet);
  TestValidator.equals(
    "second timesheet is also draft",
    secondTimesheet.status,
    "draft",
  );
  // 6. Attempt to submit second timesheet - should be REJECTED for duplicate week
  await TestValidator.error("duplicate week rejection", async () => {
    await api.functional.hrms.member.timesheets.submit(memberConnection, {
      timesheetId: secondTimesheet.id,
    });
  });
}
