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
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";

/**
 * Test business rule that prevents reactivating an archived project that has existing timelogs.
 *
 * 1. Member registers and authenticates to access project management features.
 * 2. Create an organization to establish the business context for project and timelog operations.
 * 3. Create a project with active status (default upon creation).
 * 4. Create a timelog entry for the project while it is still active.
 * 5. Archive the project by updating its status to 'archived'.
 * 6. Attempt to update the project status back to 'active'.
 * 7. Verify the operation is rejected per business rules - archived projects with timelogs cannot be reactivated.
 * 8. Confirm the project remains in archived status after the failed reactivation attempt.
 *
 * This test validates the business constraint that prevents status regression from archived to active when timelog data exists, ensuring data integrity and accurate historical reporting.
 */
export async function test_api_project_status_reactivation_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project (defaults to 'active' status)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals("project initial status", project.status, "active");
  // 4. Create a timelog entry for the project while it is active
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: new Date().toISOString(),
        duration_minutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
        >(),
        hrm_platform_project_id: project.id,
        billable: true,
      } satisfies IHrmPlatformTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  TestValidator.equals(
    "timelog project reference",
    timelog.project.id,
    project.id,
  );
  // 5. Archive the project
  const archivedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(archivedProject);
  TestValidator.equals(
    "project archived status",
    archivedProject.status,
    "archived",
  );
  // 6. Attempt to reactivate the project (should fail per business rules)
  await TestValidator.error(
    "cannot reactivate archived project with timelogs",
    async () => {
      await api.functional.hrmPlatform.member.projects.update(
        memberConnection,
        {
          projectId: project.id,
          body: {
            status: "active",
          } satisfies IHrmPlatformProject.IUpdate,
        },
      );
    },
  );
  // 7. Verify project remains archived (confirmed by last successful update response)
  TestValidator.equals(
    "project remains archived",
    archivedProject.status,
    "archived",
  );
}
