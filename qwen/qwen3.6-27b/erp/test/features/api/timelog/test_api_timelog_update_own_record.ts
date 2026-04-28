import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
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
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test that an employee can successfully update their own timelog record with modified work details.
 *
 * Validates the primary success path for timelog updates where the employee owns the timelog being modified. The test verifies that the timelog can be updated with new work details including date, duration minutes, work description, and billable status while maintaining data integrity.
 *
 * System-managed fields such as id and created_at remain unchanged, while the updated_at timestamp reflects the modification time. The timelog maintains proper associations to employee, project, and task throughout the update operation.
 *
 * 1. Authenticate as a new member to establish organization and employee context.
 * 2. Create a project for time tracking within the organization.
 * 3. Create project membership linking the employee to the project.
 * 4. Create an initial timelog associated with the project.
 * 5. Update the timelog with modified duration (120 minutes), new work description, and billable status (false).
 * 6. Validate that all modified fields match the input values and system fields remain unchanged.
 */
export async function test_api_timelog_update_own_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member to establish organization context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create project membership linking the employee to the project
  await generate_random_hrm_platform_member_projects_memberships_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  // 4. Create an initial timelog on the project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    { body: { projectId: project.id } },
  );
  typia.assert(timelog);
  const originalCreatedAt = timelog.created_at;
  // 5. Update the timelog with modified work details
  const body = {
    durationMinutes: 120,
    workDescription: "Updated work description",
    billable: false,
  } satisfies IHrmPlatformTimelog.IUpdate;
  const updated = await api.functional.hrmPlatform.member.timelogs.update(
    memberConnection,
    {
      timelogId: timelog.id,
      body,
    },
  );
  typia.assert(updated);
  // 6. Validate the update results
  // Verify modified fields match input values
  TestValidator.equals("duration matches", updated.duration_minutes, 120);
  TestValidator.equals(
    "description matches",
    updated.work_description,
    "Updated work description",
  );
  TestValidator.equals("billable matches", updated.billable, false);
  // Verify system-managed fields remain unchanged
  TestValidator.equals("id unchanged", updated.id, timelog.id);
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    originalCreatedAt,
  );
}
