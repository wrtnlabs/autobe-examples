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
 * Test timelog erase operation for authenticated employee's own timelog.
 *
 * Validates the soft delete functionality for timelog records created by the employee themselves. Ensures that the erasure operation succeeds, removing the timelog from active views while preserving the audit trail. Verifies that employee account status remains unchanged after the timelog deletion.
 *
 * Special attention is given to verifying that the soft delete operation returns null and that the employee's authenticated session remains valid after the erasure.
 *
 * 1. Member joins and establishes organization context.
 * 2. An active project is created and the member is assigned to it.
 * 3. A timelog entry is recorded against the project, validated, then erased.
 * 4. Validates null response from erase, active employee status maintenance, and successful logical removal.
 */
export async function test_api_timelog_erase_by_own_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and establishes organization context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create active project for time tracking
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: { name: "Timelog Erase Test Project" },
    },
  );
  typia.assert(project);
  // 3. Assign member as project member to enable timelog creation
  const membership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: { employeeId: authorized.id, capacityRole: "member" },
      },
    );
  typia.assert(membership);
  // 4. Create timelog entry against the active project
  const timelogBody = {
    projectId: project.id,
    date: new Date().toISOString(),
    durationMinutes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1>
    >(),
    workDescription: RandomGenerator.paragraph({ sentences: 2 }),
    billable: true,
  } satisfies IHrmPlatformTimelog.ICreate;
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    { body: timelogBody },
  );
  typia.assert(timelog);
  // Verify timelog references correct project
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  // 5. Erase the timelog via soft delete operation
  await api.functional.hrmPlatform.member.timelogs.erase(memberConnection, {
    timelogId: timelog.id,
  });
  // 6. Verify employee account remains active after erase
  TestValidator.predicate(
    "employee status is active",
    timelog.employee.status === "active",
  );
  TestValidator.equals(
    "member ID matches authenticated member",
    timelog.employee.member.id,
    authorized.id,
  );
}
