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
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test submitting a draft timesheet for manager approval.
 *
 * Validates the timesheet submission workflow where an employee transitions a draft timesheet to submitted status. This workflow is critical for time tracking approval processes, ensuring that once submitted, timelogs become locked and enter the manager review queue.
 *
 * The test verifies that:
 * 1. A draft timesheet can be created with associated timelogs
 * 2. The timesheet can be submitted by updating its status
 * 3. The submitted_at timestamp is set upon submission
 * 4. The status correctly transitions from draft to submitted
 *
 * 1. Member registration and authentication
 *    1.1. Create a new member account with email and password
 *    1.2. Authenticate and obtain organization context
 * 2. Project and timelog setup
 *    2.1. Create a project for timelog association
 *    2.2. Generate multiple timelogs for the employee across different days
 * 3. Draft timesheet creation
 *    3.1. Create a draft timesheet covering the week containing the timelogs
 *    3.2. Verify the timesheet is in draft status with timelogs included
 * 4. Timesheet submission
 *    4.1. Update the timesheet status from draft to submitted
 *    4.2. Verify submitted_at timestamp is populated
 *    4.3. Verify status is now 'submitted'
 */
export async function test_api_timesheet_submit_for_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // Note: Organization creation would be needed here, but using existing organization from auth response
  // For this test, we assume the member has access to an organization
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("No organization available for testing");
  }
  // 2. Project and timelog setup
  // Note: Project creation utility not available, using random project ID
  // In real scenario, we would need to create a project first
  const projectId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple timelogs for the employee
  const timelogs = await ArrayUtil.asyncRepeat(3, async () => {
    const timelog =
      await generate_random_hrm_member_organizations_timelogs_create(
        memberConnection,
        {
          body: {
            hrm_project_id: projectId,
            date: typia.random<string & tags.Format<"date-time">>(),
            duration_minutes: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
            >(),
            billable: true,
          } satisfies IHrmTimelog.ICreate,
          params: {
            organizationId,
          },
        },
      );
    typia.assert(timelog);
    return timelog;
  });
  // 3. Draft timesheet creation
  const weekStartDate = new Date(timelogs[0].date);
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Set to Monday
  const draftTimesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: memberAuth.id,
          week_start_date: weekStartDate.toISOString(),
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(draftTimesheet);
  // Validate draft status
  TestValidator.equals("draft status", draftTimesheet.status, "draft");
  TestValidator.predicate("has timelogs", draftTimesheet.timelogs.length > 0);
  // 4. Timesheet submission
  const submittedTimesheet =
    await api.functional.hrm.member.organizations.timesheets.update(
      memberConnection,
      {
        organizationId,
        timesheetId: draftTimesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmTimesheetTimelog.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // Validate submission
  TestValidator.equals(
    "submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted_at is set",
    submittedTimesheet.submitted_at !== null &&
      submittedTimesheet.submitted_at !== undefined,
  );
}
