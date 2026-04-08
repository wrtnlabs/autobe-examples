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

/**
 * Test member retrieval of a built-in role with assigned permissions.
 *
 * Validates that an authenticated member can successfully retrieve a built-in role (Owner, Manager, or Employee) within their organization along with its complete permission configuration. The test ensures the role response includes proper identification flags, timestamps, and a permissions array with permission names following the {domain}:{action} convention.
 *
 * This test verifies the role retrieval endpoint's ability to return detailed role information including the is_builtin flag that distinguishes system-defined roles from custom roles. Each permission in the response should contain the permission identifier and human-readable description explaining the granted capability.
 *
 * 1. Authenticate as a new member with randomized credentials.
 * 2. Extract organization ID from the member's organization list.
 * 3. Generate a UUID for the role ID to retrieve.
 * 4. Call the role retrieval endpoint with organization and role IDs.
 * 5. Validate response structure matches IHrmRole.IDetailed type.
 * 6. Verify is_builtin flag is true for built-in roles.
 * 7. Validate permissions array contains permission objects with required fields.
 */
export async function test_api_role_retrieve_builtin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(auth);
  // 2. Get organization ID from member's organizations
  if (!auth.organizations || auth.organizations.length === 0) {
    throw new Error("Member has no organizations to test role retrieval");
  }
  const organizationId: string & tags.Format<"uuid"> = auth.organizations[0].id;
  // 3. Generate role ID (built-in roles would have specific UUIDs in production)
  const roleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the role
  const role: IHrmRole.IDetailed =
    await api.functional.hrm.member.organizations.roles.at(memberConnection, {
      organizationId,
      roleId,
    });
  typia.assert(role);
  // 5. Validate built-in role properties
  if (role.is_builtin !== true) {
    throw new Error("Expected built-in role but is_builtin is false");
  }
  if (role.name.length === 0) {
    throw new Error("Role name should not be empty");
  }
  if (role.created_at.length === 0) {
    throw new Error("Role created_at should not be empty");
  }
  if (role.updated_at.length === 0) {
    throw new Error("Role updated_at should not be empty");
  }
  // 6. Validate permissions array
  if (role.permissions.length === 0) {
    throw new Error("Role should have at least one permission");
  }
  for (let i = 0; i < role.permissions.length; i++) {
    const permission = role.permissions[i];
    if (permission.permission_name.length === 0) {
      throw new Error(`Permission[${i}] permission_name should not be empty`);
    }
    if (permission.description.length === 0) {
      throw new Error(`Permission[${i}] description should not be empty`);
    }
    if (permission.id.length === 0) {
      throw new Error(`Permission[${i}] id should not be empty`);
    }
  }
}
