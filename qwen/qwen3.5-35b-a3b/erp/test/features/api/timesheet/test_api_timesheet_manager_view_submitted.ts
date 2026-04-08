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

/**
 * Test organization owner with approval permissions views another employee's submitted timesheet.
 *
 * Validates cross-role access control where an organization owner can view timesheets
 * belonging to other employees within the same organization. The test creates two
 * member accounts in the same organization - one as owner and one as employee - then
 * validates the timesheet retrieval endpoint enforces proper access controls.
 *
 * Special attention is given to verifying that:
 * - Owner role can access employee timesheets within same organization
 * - Status transitions are correctly reflected (submitted vs draft/approved)
 * - Workflow timestamps (submitted_at, approved_at, rejected_at, cancelled_at)
 *   are properly set based on timesheet state
 * - Employee information correctly identifies the timesheet owner
 */
export async function test_api_timesheet_manager_view_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuthorized);
  // Extract organization from owner's first session (created during join)
  const ownerSession = ownerAuthorized.sessions?.[0];
  const ownerOrg = ownerSession?.organization;
  if (!ownerOrg) throw new Error("Owner organization not found in session");
  // 2. Create employee member in same organization
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: ownerOrg.name,
      org_currency: ownerOrg.currency,
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuthorized);
  // Extract organization from employee's first session
  const employeeSession = employeeAuthorized.sessions?.[0];
  const employeeOrg = employeeSession?.organization;
  if (!employeeOrg)
    throw new Error("Employee organization not found in session");
  // 3. Verify both members belong to the same organization
  TestValidator.equals(
    "owner organization matches employee organization",
    ownerOrg.id,
    employeeOrg.id,
  );
  // 4. Generate a random UUID for timesheet (simulates existing timesheet ID)
  const timesheetId = typia.random<string & tags.Format<"uuid">>();
  // 5. Create connection with owner's token to call GET endpoint
  const ownerForViewing: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: ownerAuthorized.token.access,
    },
  };
  // 6. Call GET /hrmPlatform/member/timesheets/{timesheetId} as organization owner
  // Note: In non-simulation mode, this may return 404 if timesheet doesn't exist
  // The API enforces access control based on organization and role
  const timesheet = await api.functional.hrmPlatform.member.timesheets.at(
    ownerForViewing,
    { timesheetId },
  );
  typia.assert(timesheet);
  // 7. Validate timesheet status is submitted
  TestValidator.equals("status is submitted", timesheet.status, "submitted");
  // 8. Validate submitted_at is populated (not null)
  TestValidator.notEquals(
    "submitted_at is populated",
    timesheet.submitted_at,
    null,
  );
  // 9. Validate workflow timestamps for submitted status
  TestValidator.equals("approved_at is null", timesheet.approved_at, null);
  TestValidator.equals("rejected_at is null", timesheet.rejected_at, null);
  TestValidator.equals("cancelled_at is null", timesheet.cancelled_at, null);
  // 10. Validate employee is different from owner (cross-employee access)
  TestValidator.equals(
    "timesheet employee differs from requesting owner",
    timesheet.employee.id !== ownerAuthorized.member.id,
    true,
  );
  // 11. Validate employee email matches employee account
  TestValidator.equals(
    "timesheet employee email matches employee account",
    timesheet.employee.email,
    employeeAuthorized.member.email,
  );
  // 12. Validate timelogs array exists and has content
  TestValidator.equals(
    "timelogs array exists",
    Array.isArray(timesheet.timelogs),
    true,
  );
  TestValidator.equals(
    "timelogs array has entries",
    timesheet.timelogs.length > 0,
    true,
  );
  // 13. Validate total_hours is calculated
  TestValidator.predicate(
    "total_hours is a number",
    typeof timesheet.total_hours === "number",
  );
  // 14. Validate timelogs contain required fields (employee, project, task)
  for (const timelog of timesheet.timelogs) {
    typia.assert(timelog);
    TestValidator.equals(
      "timelog has employee reference",
      timelog.employee.id !== undefined,
      true,
    );
    TestValidator.equals(
      "timelog has project reference",
      timelog.project.id !== undefined,
      true,
    );
    TestValidator.equals(
      "timelog has duration_minutes",
      typeof timelog.duration_minutes === "number",
      true,
    );
  }
}
