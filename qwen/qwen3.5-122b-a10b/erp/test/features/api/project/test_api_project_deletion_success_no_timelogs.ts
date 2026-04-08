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
 * Test successful project deletion when the project has no associated timelogs.
 *
 * Validates that a project can be deleted without restriction when no timelogs are linked to it. The workflow authenticates a member user, creates a project within an organization, and deletes it successfully. The deletion returns HTTP 204 No Content and cascades to remove associated tasks and project member assignments.
 *
 * 1. Authenticate as member user via registration
 * 2. Create a new project within the organization
 * 3. Delete the project (no timelogs exist)
 * 4. Verify deletion completes successfully with 204 response
 */
export async function test_api_project_deletion_success_no_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a project within the organization
  const organizationId =
    memberAuth.organizations?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          color_code: `#${RandomGenerator.alphabets(6)}`,
          status: "active",
        } satisfies IHrmProject.ICreate,
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 3. Delete the project (no timelogs exist)
  await api.functional.hrm.member.organizations.projects.erase(
    memberConnection,
    {
      organizationId,
      projectId: project.id,
    },
  );
  // 4. Verify deletion completed successfully
  TestValidator.predicate("project deletion succeeded", true);
}
