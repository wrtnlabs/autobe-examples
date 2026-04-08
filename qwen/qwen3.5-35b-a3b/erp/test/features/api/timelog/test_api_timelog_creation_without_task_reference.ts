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
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
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
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test timelog creation without task reference, validating that the task_id field is optional and work can be logged at the project level only.
 *
 * This test validates the complete workflow of registering a member, creating a project, and creating a timelog entry without referencing a specific task. It ensures that task reference is truly optional and that work can be logged against a project without task granularity, which is useful for general activities like meetings, administrative work, or project management.
 *
 * Special attention is given to verifying that the task field is correctly set to null in the response, while all other fields including project reference, timestamps, duration, and billable flag are preserved correctly.
 *
 * 1. Register a new member account with organization details.
 * 2. Create a project within the organization with name and color code.
 * 3. Create a timelog entry that references the employee and project but sets task_id to null.
 * 4. Validate the timelog is created successfully with task reference null and all other fields correct.
 */
export async function test_api_timelog_creation_without_task_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph({ sentences: 3 }),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 3, 6, 9, 12]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create project
  const projectConnection: api.IConnection = { host: connection.host };
  const project = await api.functional.hrmPlatform.member.projects.create(
    projectConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        color_code: `#${typia.random<string>()}`,
        description: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        budget_hours: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<0>
        >(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Create timelog without task reference
  // Get employee_id from member summary
  const employeeId = joinResult.member.id;
  const projectId = project.id;
  // Capture input values for validation
  const inputDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const inputBillable = typia.random<boolean>();
  // Calculate duration from start/end times
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - 2); // 2 hours ago
  const endDate = new Date();
  const startDatetime = startDate.toISOString();
  const endDatetime = endDate.toISOString();
  const durationMinutes = Math.round(
    (new Date(endDatetime).getTime() - new Date(startDatetime).getTime()) /
      60000,
  );
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    projectConnection,
    {
      body: {
        employee_id: employeeId,
        project_id: projectId,
        task_id: null, // Explicitly null - no task reference
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        duration_minutes: durationMinutes,
        description: inputDescription,
        billable: inputBillable,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 4. Validate timelog creation
  TestValidator.equals("timelog task is null", timelog.task, null);
  TestValidator.equals(
    "timelog employee matches",
    timelog.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    projectId,
  );
  TestValidator.equals(
    "start datetime matches",
    timelog.start_datetime,
    startDatetime,
  );
  TestValidator.equals(
    "end datetime matches",
    timelog.end_datetime,
    endDatetime,
  );
  TestValidator.equals(
    "duration matches",
    timelog.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals(
    "description matches",
    timelog.description,
    inputDescription,
  );
  TestValidator.equals(
    "billable flag matches",
    timelog.billable,
    inputBillable,
  );
}