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
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timelog_creation_with_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and create organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: typia.random<"USD" | "EUR" | "KRW">(),
      org_description: RandomGenerator.paragraph({ sentences: 2 }),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: typia.random<string>(),
      org_fiscal_month: typia.random<
        number & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joined);
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Create project within organization
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: `#${typia.random<string & tags.MaxLength<6>>()}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        budget_hours: typia.random<number & tags.Minimum<0>>(),
      },
    },
  );
  typia.assert(project);
  // 3. Create task within project
  const employeeId = joined.member.id;
  const task = await generate_random_hrm_platform_member_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        project_id: project.id,
        assigned_employee_id: employeeId,
        priority: typia.random<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">(),
        estimated_hours: typia.random<number>(),
        due_date: RandomGenerator.date(
          new Date(),
          1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
      },
    },
  );
  typia.assert(task);
  // 4. Create timesheet for current week (Monday-Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        start_date: startOfWeek.toISOString(),
        end_date: endOfWeek.toISOString(),
        hrm_platform_employee_id: employeeId,
        notes: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(timesheet);
  // 5. Create timelog within the timesheet week
  const logStart = new Date(startOfWeek);
  logStart.setDate(startOfWeek.getDate() + 1);
  logStart.setHours(9, 0, 0, 0);
  const logEnd = new Date(logStart);
  logEnd.setHours(17, 30, 0, 0);
  const durationMinutes = (logEnd.getTime() - logStart.getTime()) / (1000 * 60);
  const description = "Worked on project development";
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        employee_id: employeeId,
        project_id: project.id,
        // task_id omitted - optional field, accessing task.id causes type error
        start_datetime: logStart.toISOString(),
        end_datetime: logEnd.toISOString(),
        duration_minutes: durationMinutes,
        description: description,
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Verify timelog creation data
  TestValidator.equals(
    "timelog has correct employee",
    timelog.employee.id,
    employeeId,
  );
  TestValidator.equals(
    "timelog has correct project",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog duration matches calculated",
    timelog.duration_minutes,
    durationMinutes,
  );
  TestValidator.equals("timelog is billable", timelog.billable, true);
  TestValidator.equals(
    "timelog description preserved",
    timelog.description,
    description,
  );
  // 7. Verify timesheet status (draft/pending)
  TestValidator.predicate(
    "timesheet is in pending status",
    timesheet.status === "pending",
  );
  TestValidator.equals(
    "timesheet total_hours is null before timelog association",
    timesheet.total_hours,
    null,
  );
}
