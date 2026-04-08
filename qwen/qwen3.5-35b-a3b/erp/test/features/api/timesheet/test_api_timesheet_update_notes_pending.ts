import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timesheet_update_notes_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for employee
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<string>(),
      org_timezone: "UTC",
      org_fiscal_month: 1,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create timesheet for employee in pending status
  const timesheetConnection: api.IConnection = { host: connection.host };
  const startDate = new Date("2024-01-01T00:00:00Z");
  const endDate = new Date("2024-01-07T23:59:59Z");
  const initialTimesheet =
    await api.functional.hrmPlatform.member.timesheets.create(
      timesheetConnection,
      {
        body: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          hrm_platform_employee_id: auth.member.id,
          notes: "Initial notes before update",
        } satisfies IHrmPlatformTimesheet.ICreate,
      },
    );
  typia.assert(initialTimesheet);
  TestValidator.equals(
    "timesheet status is pending",
    initialTimesheet.status,
    "pending",
  );
  // 3. Update notes on the pending timesheet
  const updatedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.update(
      timesheetConnection,
      {
        timesheetId: initialTimesheet.id,
        body: {
          notes: "Updated notes with new explanations",
        } satisfies IHrmPlatformTimesheet.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 4. Validate the update
  TestValidator.equals(
    "notes updated correctly",
    updatedTimesheet.notes,
    "Updated notes with new explanations",
  );
  TestValidator.equals(
    "status remains pending",
    updatedTimesheet.status,
    "pending",
  );
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedTimesheet.updated_at,
    initialTimesheet.updated_at,
  );
  TestValidator.equals(
    "employee reference unchanged",
    updatedTimesheet.employee.id,
    auth.member.id,
  );
  TestValidator.equals(
    "start_date unchanged",
    updatedTimesheet.start_date,
    initialTimesheet.start_date,
  );
  TestValidator.equals(
    "end_date unchanged",
    updatedTimesheet.end_date,
    initialTimesheet.end_date,
  );
  TestValidator.equals(
    "timelogs array unchanged",
    updatedTimesheet.timelogs.length,
    initialTimesheet.timelogs.length,
  );
  TestValidator.equals(
    "total_hours unchanged",
    updatedTimesheet.total_hours,
    initialTimesheet.total_hours,
  );
}
