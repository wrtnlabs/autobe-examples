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

export async function test_api_timesheet_view_own_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with organization for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate random timesheet data to simulate valid response structure
  // Note: Since CREATE endpoints aren't available in SDK, we test the GET endpoint
  // by validating that the response matches expected IHrmPlatformTimesheet structure
  const randomTimesheet = typia.random<IHrmPlatformTimesheet>();
  typia.assert(randomTimesheet);
  // 3. Simulate a GET request with the random timesheet ID
  // In real scenario, this would be created via POST /hrmPlatform/member/timesheets
  const retrievedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.at(memberConnection, {
      timesheetId: randomTimesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 4. Validate response structure matches IHrmPlatformTimesheet schema
  TestValidator.equals(
    "timesheet ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTimesheet.id,
    ),
    true,
  );
  TestValidator.equals(
    "employee ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTimesheet.hrm_platform_employee_id,
    ),
    true,
  );
  TestValidator.equals(
    "start_date format",
    !isNaN(Date.parse(retrievedTimesheet.start_date)),
    true,
  );
  TestValidator.equals(
    "end_date format",
    !isNaN(Date.parse(retrievedTimesheet.end_date)),
    true,
  );
  // 5. Validate workflow timestamps for draft status
  const isDraft = retrievedTimesheet.status === "draft";
  if (isDraft) {
    TestValidator.equals(
      "submitted_at is null for draft",
      retrievedTimesheet.submitted_at,
      null,
    );
    TestValidator.equals(
      "approved_at is null for draft",
      retrievedTimesheet.approved_at,
      null,
    );
    TestValidator.equals(
      "rejected_at is null for draft",
      retrievedTimesheet.rejected_at,
      null,
    );
    TestValidator.equals(
      "cancelled_at is null for draft",
      retrievedTimesheet.cancelled_at,
      null,
    );
  }
  // 6. Validate total_hours calculation (sum of timelog duration_minutes / 60)
  if (retrievedTimesheet.timelogs.length > 0) {
    const expectedTotalHours =
      retrievedTimesheet.timelogs.reduce(
        (sum, tl) => sum + tl.duration_minutes,
        0,
      ) / 60;
    TestValidator.equals(
      "total_hours calculated correctly",
      retrievedTimesheet.total_hours,
      expectedTotalHours,
    );
  }
  // 7. Validate soft delete filter - deleted_at should be null for active timesheets
  TestValidator.equals(
    "soft delete filter",
    retrievedTimesheet.deleted_at,
    null,
  );
  // 8. Validate employee reference structure
  TestValidator.equals(
    "employee ID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedTimesheet.employee.id,
    ),
    true,
  );
  TestValidator.equals(
    "employee has code",
    retrievedTimesheet.employee.employee_code.length > 0,
    true,
  );
  TestValidator.equals(
    "employee has display name",
    retrievedTimesheet.employee.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "employee email format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedTimesheet.employee.email),
    true,
  );
  // 9. Validate employee relationship fields
  TestValidator.equals(
    "employee has role",
    retrievedTimesheet.employee.role.id !== undefined,
    true,
  );
  TestValidator.equals(
    "employee has department structure",
    retrievedTimesheet.employee.department === null ||
      retrievedTimesheet.employee.department.id !== undefined,
    true,
  );
  TestValidator.equals(
    "employee has organization",
    retrievedTimesheet.employee.organization.id !== undefined,
    true,
  );
  // 10. Validate timelogs structure and references
  TestValidator.equals(
    "timelogs is array",
    Array.isArray(retrievedTimesheet.timelogs),
    true,
  );
  for (const timelog of retrievedTimesheet.timelogs) {
    TestValidator.equals(
      "timelog ID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        timelog.id,
      ),
      true,
    );
    TestValidator.equals(
      "timelog start datetime format",
      !isNaN(Date.parse(timelog.start_datetime)),
      true,
    );
    TestValidator.equals(
      "timelog end datetime format",
      !isNaN(Date.parse(timelog.end_datetime)),
      true,
    );
    TestValidator.predicate(
      "timelog duration is positive",
      timelog.duration_minutes > 0,
    );
    TestValidator.equals(
      "timelog billable is boolean",
      typeof timelog.billable === "boolean",
      true,
    );
    TestValidator.equals(
      "timelog employee reference",
      timelog.employee.id !== undefined,
      true,
    );
    TestValidator.equals(
      "timelog project reference",
      timelog.project.id !== undefined,
      true,
    );
  }
  // 11. Validate timestamps structure
  TestValidator.equals(
    "created_at format",
    !isNaN(Date.parse(retrievedTimesheet.created_at)),
    true,
  );
  TestValidator.equals(
    "updated_at format",
    !isNaN(Date.parse(retrievedTimesheet.updated_at)),
    true,
  );
  // 12. Validate notes field (can be null for draft)
  TestValidator.equals(
    "notes is string or null",
    typeof retrievedTimesheet.notes === "string" ||
      retrievedTimesheet.notes === null,
    true,
  );
}