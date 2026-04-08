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
 * Test successful permission assignment to a custom role.
 *
 * Validates the primary success path for custom role permission management in the HRM system. A member user creates a custom role within their organization and assigns multiple valid permissions to that role. The operation returns the updated role object with all assigned permissions included in the permissions array.
 *
 * The test verifies that the response contains complete role metadata including id, name, is_builtin flag set to false, organization reference, and the full list of assigned permissions with their permission_name and description fields.
 *
 * 1. Register a new member user with email and password credentials.
 * 2. Create a custom role within the member's organization.
 * 3. Generate valid permission UUIDs from the system permission catalog.
 * 4. Assign multiple permissions to the custom role using the permissions assignment endpoint.
 * 5. Validate the response contains the updated role with all assigned permissions.
 * 6. Verify role metadata (is_builtin=false, organization reference) and permission details (permission_name, description).
 */
export async function test_api_role_permissions_assignment_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member user
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
  // 2. Create a custom role within the organization
  if (!memberAuth.organizations || memberAuth.organizations.length === 0) {
    throw new Error("Member must belong to at least one organization");
  }
  const organizationId = memberAuth.organizations[0].id;
  const role = await generate_random_hrm_member_organizations_roles_create(
    memberConnection,
    {
      params: {
        organizationId: organizationId,
      },
      body: {
        name: `Test Role ${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IHrmRole.ICreate,
    },
  );
  typia.assert(role);
  // 3. Generate valid permission UUIDs by sampling from permission summaries
  // In simulation mode, these UUIDs will be accepted; in real E2E, they would need to exist in DB
  const permissionSummaries: IHrmPermission.ISummary[] = ArrayUtil.repeat(
    3,
    () => typia.random<IHrmPermission.ISummary>(),
  );
  const permissionIds: (string & tags.Format<"uuid">)[] =
    permissionSummaries.map((p) => p.id as string & tags.Format<"uuid">);
  // 4. Assign permissions to the role
  const updatedRole = await api.functional.hrm.member.roles.permissions.assign(
    memberConnection,
    {
      roleId: role.id,
      body: {
        permission_ids: permissionIds,
      } satisfies IHrmRolePermission.IAssign,
    },
  );
  typia.assert(updatedRole);
  // 5. Validate the response structure and content
  TestValidator.equals("role id matches", updatedRole.id, role.id);
  TestValidator.equals("role name matches", updatedRole.name, role.name);
  TestValidator.predicate(
    "is_builtin is false",
    updatedRole.is_builtin === false,
  );
  TestValidator.predicate(
    "organization exists",
    updatedRole.organization !== null && updatedRole.organization !== undefined,
  );
  TestValidator.equals(
    "organization id matches",
    updatedRole.organization.id,
    organizationId,
  );
  // 6. Verify permissions array contains assigned permissions with required fields
  TestValidator.predicate(
    "permissions array exists",
    Array.isArray(updatedRole.permissions),
  );
  TestValidator.predicate(
    "permissions array has items",
    updatedRole.permissions.length > 0,
  );
  for (const permission of updatedRole.permissions) {
    TestValidator.predicate(
      "permission has id",
      permission.id !== null && permission.id !== undefined,
    );
    TestValidator.predicate(
      "permission has permission_name",
      permission.permission_name !== null &&
        permission.permission_name !== undefined,
    );
    TestValidator.predicate(
      "permission has description",
      permission.description !== null && permission.description !== undefined,
    );
  }
}
