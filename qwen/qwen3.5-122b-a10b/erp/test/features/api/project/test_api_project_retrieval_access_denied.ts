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
 * Test that a member receives appropriate access denial when attempting to retrieve a project they do not have permission to view.
 *
 * Validates the security enforcement of the project:view permission requirement and proper error handling for unauthorized project access attempts. The test ensures that members cannot access projects belonging to organizations they are not affiliated with.
 *
 * The test creates two independent member accounts and verifies that one member cannot retrieve a project created by another member, even when using the same organization ID. This validates proper data isolation and permission-based access control in the HRM system.
 *
 * 1. Create first member user (member1) and authenticate.
 * 2. Create second member user (member2) and authenticate.
 * 3. Member1 creates a project in an organization.
 * 4. Member2 attempts to retrieve the same project.
 * 5. Validates that member2 receives 403 Forbidden or 404 Not Found error.
 */
export async function test_api_project_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member who will create the project
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth: IHrmMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(member1Auth);
  // 2. Create second member who will NOT have access to the project
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth: IHrmMember.IAuthorized = await authorize_member_join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(member2Auth);
  // 3. Member1 creates a project in an organization
  // Using a random organization ID - in simulation mode this will work
  // In production, member1 would need to belong to the organization
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const project: IHrmProject =
    await generate_random_hrm_member_organizations_projects_create(
      member1Connection,
      {
        params: {
          organizationId,
        },
        body: {
          name: RandomGenerator.name(),
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 4. Member2 attempts to retrieve the project (should fail with 403 or 404)
  // Member2 has no relationship with this organization or project
  await TestValidator.httpError(
    "member without project access should receive error",
    [403, 404],
    async () => {
      await api.functional.hrm.member.organizations.projects.getByOrganizationidAndProjectid(
        member2Connection,
        {
          organizationId,
          projectId: project.id,
        },
      );
    },
  );
}
