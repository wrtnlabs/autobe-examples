import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_roles_create } from "../../../generate/generate_random_hrm_member_organizations_roles_create";
import { prepare_random_hrm_role } from "../../../prepare/prepare_random_hrm_role";

/**
 * Test role name uniqueness constraint within an organization.
 *
 * Validates that role names must be unique within an organization scope. When attempting to update a custom role's name to match an existing role name in the same organization, the operation must fail with a 409 conflict error.
 *
 * This test ensures that the role name uniqueness constraint is properly enforced at the organization level, preventing duplicate role names that could cause ambiguity in role selection interfaces and permission assignments.
 *
 * 1. Register a new member account via authorize_member_join.
 * 2. Create first custom role with name 'Role A' using generate_random_hrm_member_organizations_roles_create.
 * 3. Create second custom role with name 'Role B' using generate_random_hrm_member_organizations_roles_create.
 * 4. Attempt to update 'Role B' to have name 'Role A' using api.functional.hrm.member.organizations.roles.update.
 * 5. Verify the update operation fails with HTTP 409 conflict error using TestValidator.httpError.
 *
 * Business rules validated:
 * - Role name uniqueness enforced at organization level
 * - Duplicate name prevention works correctly
 * - Appropriate 409 conflict error response for naming conflicts
 */
export async function test_api_role_update_name_uniqueness_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
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
  // Generate a random organization ID (requires pre-existing organization for real testing)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create first custom role with name 'Role A'
  const roleA = await generate_random_hrm_member_organizations_roles_create(
    memberConnection,
    {
      body: {
        name: "Role A",
        description: "First test role",
      } satisfies IHrmRole.ICreate,
      params: {
        organizationId,
      },
    },
  );
  typia.assert(roleA);
  // 3. Create second custom role with name 'Role B'
  const roleB = await generate_random_hrm_member_organizations_roles_create(
    memberConnection,
    {
      body: {
        name: "Role B",
        description: "Second test role",
      } satisfies IHrmRole.ICreate,
      params: {
        organizationId,
      },
    },
  );
  typia.assert(roleB);
  // 4. Attempt to update 'Role B' to have name 'Role A' (should fail with 409)
  await TestValidator.httpError(
    "role name update to duplicate name should return 409 conflict",
    409,
    async () => {
      await api.functional.hrm.member.organizations.roles.update(
        memberConnection,
        {
          organizationId,
          roleId: roleB.id,
          body: {
            name: "Role A",
          } satisfies IHrmRole.IUpdate,
        },
      );
    },
  );
}
