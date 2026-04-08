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
 * Test project status reactivation from completed to active state.
 *
 * Validates that a member with project management permission can successfully transition a completed project back to active status. The test verifies the complete reactivation workflow including project creation with completed status, status update operation, and response validation.
 *
 * This scenario covers the business rule that completed projects can be reactivated to accept new timelogs and task assignments. The test ensures the status transition is properly recorded with updated timestamp.
 *
 * 1. Authenticate member user via join endpoint.
 * 2. Generate random organization ID for testing.
 * 3. Create a project with initial status "completed".
 * 4. Update project status to "active" via status update endpoint.
 * 5. Validate response contains updated project with status "active".
 * 6. Verify updated_at timestamp is refreshed (different from created_at).
 */
export async function test_api_project_status_reactivate_completed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(auth);
  // 2. Generate random organization ID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create project with completed status
  const completedProject =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: `#${RandomGenerator.alphabets(6).toUpperCase()}`,
          status: "completed",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(completedProject);
  // Validate initial status is completed
  TestValidator.equals("initial status", completedProject.status, "completed");
  // 4. Update project status to active
  const updatedProject =
    await api.functional.hrm.member.organizations.projects.status.update(
      memberConnection,
      {
        organizationId,
        projectId: completedProject.id,
        body: {
          status: "active",
        } satisfies IHrmProject.IStatusUpdate,
      },
    );
  typia.assert(updatedProject);
  // 5. Validate response
  TestValidator.equals(
    "status updated to active",
    updatedProject.status,
    "active",
  );
  TestValidator.equals(
    "project ID preserved",
    updatedProject.id,
    completedProject.id,
  );
  TestValidator.equals(
    "organization preserved",
    updatedProject.organization.id,
    organizationId,
  );
  // 6. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedProject.updated_at,
    completedProject.updated_at,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedProject.updated_at) >=
      new Date(completedProject.created_at),
  );
}
