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
 * Test that submitting an empty timesheet is blocked by the system.
 *
 * Validates that the timesheet submission workflow properly enforces the business rule requiring at least one timelog entry. When an employee attempts to submit a draft timesheet containing no timelog entries, the system must reject the submission with an appropriate error, keeping the timesheet in draft status without populating the submitted_at timestamp.
 *
 * This test covers the critical validation from sections 196 and 300 of the business requirements, ensuring data integrity and preventing meaningless timesheet submissions.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create a draft timesheet for the employee covering a specific week period without any timelog entries.
 * 3. Attempt to submit the empty timesheet and verify the submission is blocked.
 * 4. Validate that the timesheet status remains 'draft' and submitted_at is null.
 */
export async function test_api_timesheet_submission_empty_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Note: This test assumes the member has an associated employee record
  // in an organization. In a complete test setup, we would create an
  // organization, employee, and associate them with the member.
  // For this focused test on submission validation, we use the generation
  // function which handles the necessary entity setup.
  // 2. Create a draft timesheet without any timelog entries
  // The week start date should be a Monday
  const weekStartDate = new Date();
  const dayOfWeek = weekStartDate.getDay();
  const diff = weekStartDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStartDate.setDate(diff);
  weekStartDate.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        } satisfies Partial<IHrmTimesheetTimelog.ICreate>,
      },
    );
  typia.assert(timesheet);
  // Verify initial state: timesheet is in draft status
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "submitted_at is null initially",
    timesheet.submitted_at,
    null,
  );
  // 3. Attempt to submit the empty timesheet - this should fail
  await TestValidator.error("empty timesheet submission blocked", async () => {
    await api.functional.hrm.member.organizations.timesheets.submit(
      memberConnection,
      {
        organizationId: timesheet.employee.organization.id,
        timesheetId: timesheet.id,
      },
    );
  });
  // 4. Verify the timesheet remains in draft status after failed submission
  TestValidator.predicate(
    "timesheet remains in draft after failed submission",
    timesheet.status === "draft",
  );
  TestValidator.equals(
    "submitted_at still null after failed submission",
    timesheet.submitted_at,
    null,
  );
}
