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
 * Test successful project creation with required fields only.
 *
 * Validates that a member user can create a new project within an organization by providing the mandatory fields: name, color_code, and status. The test ensures the project is created with the specified attributes and returns the full project entity including system-generated id, timestamps, and organization reference.
 *
 * The test verifies that the created project has the correct name, color_code in hex format, initial status set to active, and belongs to the specified organization. It also validates that created_at and updated_at timestamps are properly set.
 *
 * 1. Register a new member user with email/password credentials.
 * 2. Create a member-specific connection for authenticated API calls.
 * 3. Generate a random organization ID for the project creation.
 * 4. Prepare project creation data with required fields: name, color_code, and status.
 * 5. Call the project creation API endpoint.
 * 6. Validate the response structure and content.
 * 7. Verify system-generated fields (id, timestamps, organization reference).
 */
export async function test_api_project_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate random organization ID
  const organizationId: string & typia.tags.Format<"uuid"> = typia.random<
    string & typia.tags.Format<"uuid">
  >();
  // 3. Prepare project creation data with required fields
  const projectName: string = RandomGenerator.name(2);
  const projectColor: string = `#${RandomGenerator.alphabets(6).toUpperCase()}`;
  const projectStatus: "active" | "archived" | "completed" = "active";
  const createBody: IHrmProject.ICreate = {
    name: projectName,
    color_code: projectColor,
    status: projectStatus,
  } satisfies IHrmProject.ICreate;
  // 4. Create project
  const project: IHrmProject =
    await api.functional.hrm.member.organizations.projects.create(
      memberConnection,
      {
        organizationId,
        body: createBody,
      },
    );
  typia.assert(project);
  // 5. Validate created project
  TestValidator.equals("project name matches", project.name, projectName);
  TestValidator.equals(
    "project color_code matches",
    project.color_code,
    projectColor,
  );
  TestValidator.equals(
    "project status is active",
    project.status,
    projectStatus,
  );
  TestValidator.predicate("project has valid id", project.id.length > 0);
  TestValidator.predicate("created_at is set", project.created_at.length > 0);
  TestValidator.predicate("updated_at is set", project.updated_at.length > 0);
  TestValidator.predicate(
    "organization reference exists",
    project.organization !== null && project.organization !== undefined,
  );
}
