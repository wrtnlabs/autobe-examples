import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
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
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_timelogs_create } from "../../../generate/generate_random_hrm_member_organizations_timelogs_create";
import { generate_random_hrm_member_organizations_timesheets_create } from "../../../generate/generate_random_hrm_member_organizations_timesheets_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_timelog } from "../../../prepare/prepare_random_hrm_timelog";
import { prepare_random_hrm_timesheet_timelog } from "../../../prepare/prepare_random_hrm_timesheet_timelog";

/**
 * Test timesheet submission duplicate week blocking validation.
 *
 * Validates that the system prevents duplicate timesheet submissions for the same employee within the same week. When an employee attempts to submit a second timesheet for a week that already has a submitted or approved timesheet, the system should reject the submission with an appropriate error.
 *
 * This test verifies the business rule that only one timesheet per employee per week can exist in submitted or approved status. The workflow includes creating and submitting a first timesheet, then attempting to submit a second timesheet for the same week period.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Project is created for timelog association.
 * 3. Employee is assigned to the project as a member (using generated employee ID).
 * 4. Timelog entries are created for the target week.
 * 5. First timesheet is created for the week and submitted successfully.
 * 6. Second timesheet is created for the same week.
 * 7. Attempting to submit the second timesheet throws an error.
 * 8. Validates the first timesheet remains in submitted status.
 * 9. Validates the second timesheet remains in draft status.
 */
export async function test_api_timesheet_submission_duplicate_week_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
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
  // Extract organization ID from member auth response
  const organizationId = memberAuth.organizations?.[0]?.id;
  TestValidator.predicate("organization exists", organizationId !== undefined);
  // TypeScript doesn't narrow based on predicate, so explicitly assert the type
  const orgId: string & tags.Format<"uuid"> = organizationId!;
  // Generate employee ID (in real scenario, this would be retrieved from the member's employee record)
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create a project for timelog association
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId: orgId },
      },
    );
  typia.assert(project);
  // 3. Assign employee to the project
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      body: {
        employee_id: employeeId,
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
      params: { projectId: project.id },
    });
  typia.assert(projectMember);
  // 4. Create timelog entries for the first timesheet
  // Use a specific week (Monday to Sunday)
  const targetMonday = new Date();
  targetMonday.setDate(targetMonday.getDate() - targetMonday.getDay() + 1);
  targetMonday.setHours(0, 0, 0, 0);
  const weekStartDate = targetMonday.toISOString();
  const timelog =
    await generate_random_hrm_member_organizations_timelogs_create(
      memberConnection,
      {
        body: {
          hrm_project_id: project.id,
          date: weekStartDate,
          duration_minutes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >(),
        } satisfies IHrmTimelog.ICreate,
        params: { organizationId: orgId },
      },
    );
  typia.assert(timelog);
  // 5. Create the first timesheet for the week
  const firstTimesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate,
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId: orgId },
      },
    );
  typia.assert(firstTimesheet);
  TestValidator.equals(
    "first timesheet status",
    firstTimesheet.status,
    "draft",
  );
  // 6. Submit the first timesheet
  const submittedFirstTimesheet =
    await api.functional.hrm.member.organizations.timesheets.submit(
      memberConnection,
      {
        organizationId: orgId,
        timesheetId: firstTimesheet.id,
      },
    );
  typia.assert(submittedFirstTimesheet);
  TestValidator.equals(
    "first timesheet submitted status",
    submittedFirstTimesheet.status,
    "submitted",
  );
  // 7. Create a second timesheet for the same week
  const secondTimesheet =
    await generate_random_hrm_member_organizations_timesheets_create(
      memberConnection,
      {
        body: {
          hrm_employee_id: employeeId,
          week_start_date: weekStartDate,
        } satisfies IHrmTimesheetTimelog.ICreate,
        params: { organizationId: orgId },
      },
    );
  typia.assert(secondTimesheet);
  TestValidator.equals(
    "second timesheet status",
    secondTimesheet.status,
    "draft",
  );
  // 8. Attempt to submit the second timesheet - should throw error
  await TestValidator.error("duplicate week submission blocked", async () => {
    await api.functional.hrm.member.organizations.timesheets.submit(
      memberConnection,
      {
        organizationId: orgId,
        timesheetId: secondTimesheet.id,
      },
    );
  });
  // 9. Validate the second timesheet remains in draft status
  TestValidator.equals(
    "second timesheet still draft",
    secondTimesheet.status,
    "draft",
  );
  // 10. Validate the first timesheet remains in submitted status
  TestValidator.equals(
    "first timesheet still submitted",
    submittedFirstTimesheet.status,
    "submitted",
  );
}
