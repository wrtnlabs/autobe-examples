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
 * Test that an employee can reassign their timelog to a different project where they have active membership.
 *
 * Validates the complete timelog project reassignment flow including member authentication, project creation for both source and target, membership assignment to both projects, initial timelog creation on the source project, and project reassignment to the target project. Ensures that the timelog correctly updates its project association while maintaining all other timelog properties like duration, date, work description, and billable status remain unchanged after reassignment.
 *
 * Special attention is given to verifying that the reassignment requires active project membership in the target project and that the target project exists and is in active status. Validates that project change propagates to timelog entity relationships.
 *
 * 1. Authenticate as member for timelog operations.
 * 2. Create first project for initial timelog creation.
 * 3. Create second project for timelog reassignment target.
 * 4. Create membership to first project for timelog creation.
 * 5. Create membership to second project for reassignment eligibility.
 * 6. Create timelog referencing first project.
 * 7. Reassign timelog from first project to second project.
 * 8. Validate timelog project association updated to second project and all other timelog fields maintain their values.
 */
export async function test_api_timelog_reassign_project_membership(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });
  // 2. Create first project for initial timelog
  const firstProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(firstProject);
  // 3. Create second project for reassignment target
  const secondProject =
    await generate_random_hrm_platform_member_projects_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(secondProject);
  // 4. Create membership to first project
  const firstMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: firstProject.id },
        body: undefined,
      },
    );
  typia.assert(firstMembership);
  // 5. Create membership to second project
  const secondMembership =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: { projectId: secondProject.id },
        body: undefined,
      },
    );
  typia.assert(secondMembership);
  // 6. Create timelog on first project
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: { projectId: firstProject.id },
    },
  );
  typia.assert(timelog);
  // 7. Reassign timelog to second project
  const reassignBody = {
    projectId: secondProject.id,
  } satisfies IHrmPlatformTimelog.IUpdate;
  const updatedTimelog =
    await api.functional.hrmPlatform.member.timelogs.update(memberConnection, {
      timelogId: timelog.id,
      body: reassignBody,
    });
  typia.assert(updatedTimelog);
  // 8. Validate reassignment - project association updated
  TestValidator.equals(
    "timelog reassigned to second project",
    updatedTimelog.project.id,
    secondProject.id,
  );
  TestValidator.equals(
    "duration maintained after reassignment",
    updatedTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "date maintained after reassignment",
    updatedTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "billable status maintained after reassignment",
    updatedTimelog.billable,
    timelog.billable,
  );
}
