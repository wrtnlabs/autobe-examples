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
import { generate_random_hrms_member_timesheets_create } from "../../../generate/generate_random_hrms_member_timesheets_create";
import { prepare_random_hrms_timesheet } from "../../../prepare/prepare_random_hrms_timesheet";

export async function test_api_timesheet_approval_insufficient_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register Employee 1 (timesheet owner)
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Authorized = await authorize_member_join(employee1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employee1Authorized);
  // 2. Create timesheet draft for Employee 1
  const timesheet = await api.functional.hrms.member.timesheets.create(
    employee1Connection,
    {
      body: {
        week_start_date: new Date().toISOString(),
      } satisfies IHrmsTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 3. Submit timesheet (Employee 1)
  const submittedTimesheet = await api.functional.hrms.member.timesheets.submit(
    employee1Connection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(submittedTimesheet);
  // Verify timesheet is in submitted status
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 4. Register Employee 2 (without approval permission)
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Authorized = await authorize_member_join(employee2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(employee2Authorized);
  // 5. Employee 2 attempts to approve the timesheet (should fail with 403)
  await TestValidator.httpError(
    "approval requires time:approve permission",
    403,
    async () => {
      await api.functional.hrms.member.timesheets.approve(employee2Connection, {
        timesheetId: timesheet.id,
      });
    },
  );
  // 6. Verify timesheet status remains 'submitted' (unchanged)
  TestValidator.equals(
    "timesheet status unchanged after unauthorized approval attempt",
    submittedTimesheet.status,
    "submitted",
  );
  // 7. Verify no approval information recorded (reviewer and reviewed_at should be null for submitted)
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "no reviewer set",
    submittedTimesheet.reviewer,
    undefined,
  );
  TestValidator.equals(
    "no reviewed_at set",
    submittedTimesheet.reviewed_at,
    undefined,
  );
}