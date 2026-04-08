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
 * Test member can retrieve a custom role with assigned permissions.
 *
 * Validates the complete workflow of custom role creation and retrieval within an organization. The test authenticates as a member, creates a custom role with specific permissions, then retrieves that role to verify the role-permission junction table correctly stores and returns permission assignments.
 *
 * Special attention is given to verifying that:
 * - The role's is_builtin flag is set to false for custom roles
 * - The permissions array contains all assigned permissions with correct permission_name and description fields
 * - Organization context is properly maintained throughout the workflow
 * - Role metadata (name, description, timestamps) matches the created role
 *
 * 1. Authenticate as member via join endpoint.
 * 2. Create a custom role with specific name and description.
 * 3. Retrieve the created role using the role ID.
 * 4. Validate role metadata matches creation input.
 * 5. Verify permissions array contains valid permission objects.
 */
export async function test_api_role_retrieve_custom_role_with_permissions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // Use organization from member's organizations list if available
  // In test environment, member should belong to at least one organization
  const organizationId: string & tags.Format<"uuid"> =
    memberAuth.organizations?.[0]?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 2. Create custom role with specific name and description
  const roleName = `Custom Role ${RandomGenerator.alphabets(8)}`;
  const roleDescription = `Test custom role for ${RandomGenerator.name()}`;
  const createdRole: IHrmRole =
    await generate_random_hrm_member_organizations_roles_create(
      memberConnection,
      {
        body: {
          name: roleName,
          description: roleDescription,
        } satisfies IHrmRole.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(createdRole);
  // 3. Retrieve the created role
  const retrievedRole: IHrmRole.IDetailed =
    await api.functional.hrm.member.organizations.roles.at(memberConnection, {
      organizationId,
      roleId: createdRole.id,
    });
  typia.assert(retrievedRole);
  // 4. Validate role metadata matches creation
  TestValidator.equals("role ID matches", retrievedRole.id, createdRole.id);
  TestValidator.equals("role name matches", retrievedRole.name, roleName);
  TestValidator.equals("is_builtin is false", retrievedRole.is_builtin, false);
  TestValidator.equals(
    "description matches",
    retrievedRole.description,
    roleDescription,
  );
  // 5. Validate permissions array structure
  TestValidator.predicate(
    "has permissions array",
    Array.isArray(retrievedRole.permissions) &&
      retrievedRole.permissions.length > 0,
  );
  // 6. Validate each permission object has required fields
  for (const permission of retrievedRole.permissions) {
    typia.assert(permission);
    TestValidator.predicate(
      "permission has permission_name",
      typeof permission.permission_name === "string" &&
        permission.permission_name.length > 0,
    );
    TestValidator.predicate(
      "permission has description",
      typeof permission.description === "string",
    );
  }
}
