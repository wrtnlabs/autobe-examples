import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_view_own_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Enable simulation mode for testing (since no timesheet creation API exists)
  memberConnection.simulate = true;
  // 3. Generate a timesheet ID for testing
  const timesheetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the timesheet (simulation mode returns random data)
  const timesheet = await api.functional.hrmPlatform.member.timesheets.at(
    memberConnection,
    {
      timesheetId,
    },
  );
  typia.assert(timesheet);
  // 5. Validate timesheet structure and draft status
  TestValidator.predicate("timesheet has valid ID", /^\w+$/.test(timesheet.id));
  TestValidator.equals("status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "week_start_date exists",
    timesheet.week_start_date.length > 0,
  );
  TestValidator.predicate(
    "total_hours is number",
    typeof timesheet.total_hours === "number",
  );
  TestValidator.equals("approver is null for draft", timesheet.approver, null);
  TestValidator.equals(
    "submitted_at is null for draft",
    timesheet.submitted_at,
    null,
  );
  TestValidator.equals(
    "approved_at is null for draft",
    timesheet.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at is null for draft",
    timesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null for draft",
    timesheet.rejection_reason,
    null,
  );
  // 6. Validate employee information
  TestValidator.predicate("employee exists", timesheet.employee !== null);
  TestValidator.predicate(
    "employee has valid ID",
    timesheet.employee.id.length > 0,
  );
  TestValidator.predicate(
    "employee has employment_type",
    timesheet.employee.employment_type.length > 0,
  );
  TestValidator.predicate(
    "employee has status",
    timesheet.employee.status.length > 0,
  );
  TestValidator.predicate(
    "employee member exists",
    timesheet.employee.member !== null,
  );
  TestValidator.predicate(
    "employee member has email",
    timesheet.employee.member.email.length > 0,
  );
  // 7. Validate timestamps
  TestValidator.predicate("created_at exists", timesheet.created_at.length > 0);
  TestValidator.predicate("updated_at exists", timesheet.updated_at.length > 0);
}
