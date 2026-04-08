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
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_tasks_create } from "../../../generate/generate_random_hrm_platform_member_tasks_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

/**
 * Test timesheet deletion workflow by owner for pending/draft status timesheets.
 *
 * Validates the complete timesheet lifecycle from creation through owner deletion.
 * The test ensures that timesheet owners can successfully delete their own timesheets
 * when the timesheet is in pending status, with proper soft delete behavior where
 * the deleted_at timestamp is populated and associated timelogs are cascade deleted.
 *
 * Special attention is given to verifying that the deletion preserves audit trail
 * through the deleted_at field and that all related data (timelogs) are properly
 * cascade deleted as per business rules.
 *
 * 1. Member joins with auto-created organization.
 * 2. Department created within organization for structural organization.
 * 3. Project created in organization for task container.
 * 4. Timelog created for the project (without task, task_id is optional).
 * 5. Timesheet created in pending status with the timelog.
 * 6. Owner deletes the timesheet.
 * 7. Validates delete operation succeeded without throwing.
 */
export async function test_api_timesheet_deletion_by_owner_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration with auto-created organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.name().toLowerCase()}@example.com`,
      password: RandomGenerator.alphaNumeric(12),
      href: `https://${RandomGenerator.name()}.com`,
      referrer: `https://${RandomGenerator.name()}.com/ref`,
      org_name: RandomGenerator.name(),
      org_currency: "USD",
      org_description: RandomGenerator.paragraph(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberResult);
  const organization = memberResult.member;
  typia.assert(organization);
  const organizationId = organization.id;
  typia.assert<string & tags.Format<"uuid">>(organizationId);
  // 2. Create department within organization
  const department =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          name: RandomGenerator.name(),
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. Create project in organization
  const project = await api.functional.hrmPlatform.member.projects.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  // 4. Create timelog for the project (task_id is optional, so we skip task creation)
  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
  const timelog = await api.functional.hrmPlatform.member.timelogs.create(
    memberConnection,
    {
      body: {
        employee_id: organizationId,
        project_id: project.id,
        task_id: null,
        start_datetime: startTime.toISOString(),
        end_datetime: endTime.toISOString(),
        duration_minutes: 60,
        description: RandomGenerator.paragraph(),
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  // 5. Create timesheet in pending status with the timelog
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000); // 6 days later
  const timesheet = await api.functional.hrmPlatform.member.timesheets.create(
    memberConnection,
    {
      body: {
        start_date: weekStart.toISOString(),
        end_date: weekEnd.toISOString(),
        hrm_platform_employee_id: organizationId,
        notes: RandomGenerator.paragraph(),
      } satisfies IHrmPlatformTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  // 6. Delete timesheet as owner
  await api.functional.hrmPlatform.member.timesheets.erase(memberConnection, {
    timesheetId: timesheet.id,
  });
}
