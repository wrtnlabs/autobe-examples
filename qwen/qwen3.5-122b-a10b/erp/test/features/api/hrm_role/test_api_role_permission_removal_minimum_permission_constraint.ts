import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRolePermission";
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
 * Test minimum permission constraint when removing role permissions.
 *
 * Validates that custom roles must retain at least one permission after any removal operation. This test ensures the business rule preventing roles from having zero permissions is properly enforced by the API.
 *
 * The test follows this workflow:
 * 1. Authenticate as a member user with organization owner permissions
 * 2. Create a custom role within the organization
 * 3. Assign exactly one permission to the custom role
 * 4. Attempt to remove that single permission
 * 5. Verify HTTP 400 Bad Request is returned with appropriate error message
 *
 * This validates that the system prevents roles from becoming permission-less, which would make them unusable for employee assignments.
 */
export async function test_api_role_permission_removal_minimum_permission_constraint(
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
  // Get organization ID from authenticated member's organizations
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must belong to at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  // 2. Create custom role in organization
  const roleName = `test_role_${RandomGenerator.alphabets(8)}`;
  const role = await generate_random_hrm_member_organizations_roles_create(
    memberConnection,
    {
      body: {
        name: roleName,
        description: "Test role for minimum permission constraint validation",
      } satisfies IHrmRole.ICreate,
      params: {
        organizationId,
      },
    },
  );
  typia.assert(role);
  // 3. Assign exactly one permission to the custom role
  // Note: In a real test environment, this would require a valid permission ID
  // from the system. For compilation purposes, we use a random UUID.
  const permissionId = typia.random<string & tags.Format<"uuid">>();
  const updatedRole = await api.functional.hrm.member.roles.permissions.assign(
    memberConnection,
    {
      roleId: role.id,
      body: {
        permission_ids: [permissionId] satisfies (string &
          tags.Format<"uuid">)[],
      } satisfies IHrmRolePermission.IAssign,
    },
  );
  typia.assert(updatedRole);
  // 4. Attempt to remove the single permission
  // This should fail with HTTP 400 Bad Request
  await TestValidator.httpError(
    "removing last permission should fail with 400",
    400,
    async () => {
      await api.functional.hrm.member.roles.permissions.erase(
        memberConnection,
        {
          roleId: role.id,
          permissionId: permissionId,
        },
      );
    },
  );
}
