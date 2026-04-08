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

/**
 * Test project retrieval with member view permission.
 *
 * Validates that a member user can successfully retrieve a project's complete details through the member organizations projects endpoint. The test ensures the response includes all project attributes including identification fields, descriptive fields, lifecycle fields, and optional planning fields. The organization relation is verified to be returned as IHrmOrganization.ISummary.
 *
 * This test covers the primary success path for project retrieval with proper authorization, ensuring that the project:view permission allows access to project data within the member's organization context.
 *
 * 1. Member user authenticates via email/password registration.
 * 2. Member retrieves a project by organization code and project ID.
 * 3. Validates response contains all required project fields.
 * 4. Verifies organization relation is properly included as summary.
 */
export async function test_api_project_retrieval_with_view_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve project (using random organization code and project ID)
  const organizationCode = typia.random<string>();
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const project =
    await api.functional.hrm.member.organizations.projects.getByOrganizationcodeAndProjectid(
      memberConnection,
      {
        organizationCode,
        projectId,
      },
    );
  typia.assert(project);
  // 3. Validate project structure
  TestValidator.equals("project has id", project.id !== undefined, true);
  TestValidator.equals("project has name", project.name !== undefined, true);
  TestValidator.equals(
    "project has color_code",
    project.color_code !== undefined,
    true,
  );
  TestValidator.equals(
    "project has status",
    project.status !== undefined,
    true,
  );
  TestValidator.equals(
    "project has created_at",
    project.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "project has updated_at",
    project.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "project has deleted_at",
    project.deleted_at !== undefined,
    true,
  );
  // 4. Validate organization relation
  TestValidator.equals(
    "project has organization",
    project.organization !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has id",
    project.organization.id !== undefined,
    true,
  );
  TestValidator.equals(
    "organization has name",
    project.organization.name !== undefined,
    true,
  );
}
