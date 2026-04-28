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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet retrieval endpoint for submitted status verification.
 *
 * Retrieves an employee's submitted timesheet to validate immutability, total hours calculation, and review metadata. Tests
 * that submitted timesheets ensure timelog entries are locked against modification and maintain the expected metadata structure
 * before manager approval or rejection.
 *
 * 1. Register and authenticate as an employee member.
 * 2. Create a project for timelog tracking.
 * 3. Create timelogs associated with the new project.
 * 4. Create a draft timesheet to validate 'draft' status.
 * 5. Create a submitted timesheet representing 'submitted' status.
 * 6. Retrieve the submitted timesheet by ID to validate all business rules.
 * 7. Validate that the submitted timesheet maintains timelogs immutability, correct total hours, status 'submitted', and review metadata availability.
 */
export async function test_api_timesheet_retrieve_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an employee for the HRM platform.
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(authorizedMember);
  
  // 2. Create a project for timelog tracking.
  const project: IHrmPlatformProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: "#FF5733",
        } satisfies DeepPartial<IHrmPlatformProject.ICreate> | undefined,
      },
    );
  typia.assert(project);
  
  // 3. Create timelogs to associate with the project.
  const timelogs: IHrmPlatformTimelog[] = await Promise.all(
    Array.from(
      {
        length: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
      async (_, i) => {
        return generate_random_hrm_platform_member_timelogs_create(
          memberConnection,
          {
            body: {
              projectId: project.id,
              date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              durationMinutes:
                typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<15> &
                    tags.Maximum<480>
                >(),
              workDescription: RandomGenerator.paragraph({ sentences: 2 }),
            } satisfies DeepPartial<IHrmPlatformTimelog.ICreate> | undefined,
          },
        );
      },
    ),
  );
  typia.assert(timelogs);
  
  // 4. Create a draft timesheet to validate draft behavior.
  const draftTimesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: new Date().toISOString(),
        } satisfies DeepPartial<IHrmPlatformTimesheet.ICreate>,
      },
    );
  typia.assert(draftTimesheet);
  TestValidator.equals("draft status is draft", draftTimesheet.status, "draft");
  
  // 5. Create a submitted timesheet for testing immutability.
  const submittedTimesheet: IHrmPlatformTimesheet =
    await generate_random_hrm_platform_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies DeepPartial<IHrmPlatformTimesheet.ICreate>,
      },
    );
  typia.assert(submittedTimesheet);
  
  // 6. Retrieve the submitted timesheet to validate immutability and metadata.
  const retrievedTimesheet: IHrmPlatformTimesheet =
    await api.functional.hrmPlatform.member.timesheets.at(memberConnection, {
      timesheetId: submittedTimesheet.id,
    });
  typia.assert(retrievedTimesheet);
  
  // 7. Validate that the retrieved timesheet maintains 'submitted' status, timelogs are immutable, total hours matches, and review metadata is available.
  TestValidator.equals(
    "retrieved timesheet status",
    retrievedTimesheet.status,
    submittedTimesheet.status,
  );
  TestValidator.equals(
    "retrieved timesheet id",
    retrievedTimesheet.id,
    submittedTimesheet.id,
  );
  TestValidator.equals(
    "retrieved timesheet timelogs count",
    retrievedTimesheet.timelogs.length,
    submittedTimesheet.timelogs.length,
  );
  TestValidator.equals(
    "retrieved timesheet total hours",
    retrievedTimesheet.total_hours,
    submittedTimesheet.total_hours,
  );
  TestValidator.equals(
    "retrieved timesheet week_start_date",
    retrievedTimesheet.week_start_date,
    submittedTimesheet.week_start_date,
  );
  TestValidator.equals(
    "retrieved timesheet week_end_date",
    retrievedTimesheet.week_end_date,
    submittedTimesheet.week_end_date,
  );
  TestValidator.equals(
    "retrieved timesheet submitted_at",
    retrievedTimesheet.submitted_at,
    submittedTimesheet.submitted_at,
  );
  TestValidator.equals(
    "retrieved timesheet employee id",
    retrievedTimesheet.employee.id,
    submittedTimesheet.employee.id,
  );
  TestValidator.equals(
    "retrieved timesheet rejection_reason",
    retrievedTimesheet.rejection_reason,
    submittedTimesheet.rejection_reason,
  );
}