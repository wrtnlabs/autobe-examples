import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";

/**
 * Test archiving an active project through status update endpoint.
 *
 * Validates the project status transition workflow from active to archived state. This test ensures that members with appropriate permissions can pause active projects while preserving all historical time tracking data and project metadata.
 *
 * The test verifies the complete status update flow including project creation, status modification, and response validation. Special attention is given to timestamp updates and data integrity preservation during the status transition.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create a project in the organization with initial 'active' status.
 * 3. Update the project status from 'active' to 'archived'.
 * 4. Validate the response contains the updated project entity.
 * 5. Verify the status field changed to 'archived'.
 * 6. Confirm the updated_at timestamp was refreshed.
 * 7. Validate the organization reference is maintained correctly.
 */
export async function test_api_project_status_archive_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Create project with active status
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: typia.random<
            string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">
          >(),
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // Store original timestamp for comparison
  const originalUpdatedAt: string = project.updated_at;
  // 3. Update project status to archived
  const updatedProject: IHrmProject =
    await api.functional.hrm.member.organizations.projects.status.update(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          status: "archived",
        } satisfies IHrmProject.IStatusUpdate,
      },
    );
  typia.assert(updatedProject);
  // 4. Validate status changed to archived
  TestValidator.equals(
    "project status archived",
    updatedProject.status,
    "archived",
  );
  // 5. Verify updated_at timestamp was refreshed
  TestValidator.predicate(
    "updated_at timestamp refreshed",
    updatedProject.updated_at >= originalUpdatedAt,
  );
  // 6. Validate organization reference is maintained
  TestValidator.equals(
    "organization reference maintained",
    updatedProject.organization.id,
    organizationId,
  );
  // 7. Validate project ID remains unchanged
  TestValidator.equals("project ID unchanged", updatedProject.id, project.id);
  // 8. Validate project name is preserved
  TestValidator.equals(
    "project name preserved",
    updatedProject.name,
    project.name,
  );
}
