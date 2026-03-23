import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
 * Test that timelog creation is rejected when the project is archived or completed.
 * This validates the business rule that prevents time entries on non-active projects.
 */
export async function test_api_timelog_rejected_on_archived_project(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project with active status
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Update the project status to 'archived'
  const archivedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(archivedProject);
  // 4. Verify project is now archived
  TestValidator.equals(
    "project status is archived",
    archivedProject.status,
    "archived",
  );
  // 5. Attempt to create a timelog for the archived project
  // This should fail with an error
  await TestValidator.error(
    "timelog creation rejected for archived project",
    async () => {
      await generate_random_hrm_platform_member_timelogs_create(
        memberConnection,
        {
          body: {
            project_id: project.id,
            date: new Date().toISOString(),
            duration: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
            >(),
            billable: true,
            description: "Test work on archived project",
          } satisfies IHrmPlatformTimelog.ICreate,
        },
      );
    },
  );
  // 6. Update project to 'completed' status and test again
  const completedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "completed",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(completedProject);
  // 7. Verify project is now completed
  TestValidator.equals(
    "project status is completed",
    completedProject.status,
    "completed",
  );
  // 8. Attempt to create a timelog for the completed project
  // This should also fail with an error
  await TestValidator.error(
    "timelog creation rejected for completed project",
    async () => {
      await generate_random_hrm_platform_member_timelogs_create(
        memberConnection,
        {
          body: {
            project_id: project.id,
            date: new Date().toISOString(),
            duration: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
            >(),
            billable: true,
            description: "Test work on completed project",
          } satisfies IHrmPlatformTimelog.ICreate,
        },
      );
    },
  );
}
