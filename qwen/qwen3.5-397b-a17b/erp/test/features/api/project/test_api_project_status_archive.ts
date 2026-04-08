import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
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
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";

/**
 * Test archiving an active project workflow.
 *
 * Validates the complete project lifecycle management including member authentication, organization creation, active project creation, and status transition to archived. The test verifies that: 1) Status change from 'active' to 'archived' is properly reflected in the API response, 2) All existing project data (name, color, description, budget_hours, dates) is preserved after archiving, 3) The archived project remains accessible for viewing operations, 4) The updated_at timestamp is modified to reflect the status change. This test ensures that project archiving follows the business rule where archived projects cannot receive new timelogs while maintaining data integrity for historical reference.
 *
 * 1. Member registers and authenticates to access project management features.
 * 2. Creates an organization to serve as the project container.
 * 3. Creates an active project with name, color, description, and budget hours.
 * 4. Updates the project status from 'active' to 'archived'.
 * 5. Validates status change is reflected in response.
 * 6. Confirms all project data is preserved after archiving.
 * 7. Verifies updated_at timestamp changed to reflect the modification.
 */
export async function test_api_project_status_archive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 3. Create active project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        description: RandomGenerator.content({ paragraphs: 2 }),
        budgetHours: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      } satisfies IHrmPlatformProject.ICreate,
    },
  );
  typia.assert(project);
  TestValidator.equals("initial status", project.status, "active");
  // 4. Archive the project
  const updatedProject =
    await api.functional.hrmPlatform.member.projects.update(memberConnection, {
      projectId: project.id,
      body: {
        status: "archived",
      } satisfies IHrmPlatformProject.IUpdate,
    });
  typia.assert(updatedProject);
  // 5. Validate status change
  TestValidator.equals(
    "status changed to archived",
    updatedProject.status,
    "archived",
  );
  // 6. Verify all project data is preserved
  TestValidator.equals("name preserved", updatedProject.name, project.name);
  TestValidator.equals("color preserved", updatedProject.color, project.color);
  TestValidator.equals(
    "description preserved",
    updatedProject.description,
    project.description,
  );
  TestValidator.equals(
    "budget hours preserved",
    updatedProject.budget_hours,
    project.budget_hours,
  );
  TestValidator.equals(
    "start date preserved",
    updatedProject.start_date,
    project.start_date,
  );
  TestValidator.equals(
    "end date preserved",
    updatedProject.end_date,
    project.end_date,
  );
  TestValidator.equals(
    "organization preserved",
    updatedProject.organization.id,
    project.organization.id,
  );
  // 7. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    updatedProject.updated_at,
    project.updated_at,
  );
  TestValidator.predicate(
    "updated_at is later",
    new Date(updatedProject.updated_at).getTime() >
      new Date(project.updated_at).getTime(),
  );
}
