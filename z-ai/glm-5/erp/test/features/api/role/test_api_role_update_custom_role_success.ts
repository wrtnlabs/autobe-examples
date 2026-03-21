import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_role_update_custom_role_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member who becomes the organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a custom role with initial name and permissions
  const initialPermissions: IErpHrmRole.ICreate["permissions"] = [
    "employee:view",
    "project:view",
    "time:approve",
  ];
  const createdRole = await api.functional.erpHrm.member.roles.create(
    ownerConnection,
    {
      body: {
        name: "Team Lead",
        permissions: initialPermissions,
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(createdRole);
  // Store the created_at timestamp for comparison
  const originalCreatedAt = createdRole.created_at;
  // 3. Update the role with new name and modified permissions
  const updatedPermissions: IErpHrmRole.IUpdate["permissions"] = [
    "employee:view",
    "employee:manage",
    "project:view",
    "project:manage",
    "time:approve",
  ];
  const updatedRole = await api.functional.erpHrm.member.roles.update(
    ownerConnection,
    {
      roleId: createdRole.id,
      body: {
        name: "Senior Team Lead",
        permissions: updatedPermissions,
      } satisfies IErpHrmRole.IUpdate,
    },
  );
  typia.assert(updatedRole);
  // 4. Verify the response returns the updated role with the new name
  TestValidator.equals(
    "role name should be updated",
    updatedRole.name,
    "Senior Team Lead",
  );
  // 5. Verify the role's updated_at timestamp is modified
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedRole.updated_at,
    originalCreatedAt,
  );
  // 6. Verify the role's is_builtin flag remains false
  TestValidator.equals(
    "is_builtin should remain false",
    updatedRole.is_builtin,
    false,
  );
  // 7. Verify all specified permissions are returned in the permissions array
  TestValidator.equals(
    "permissions count should match",
    updatedRole.permissions.length,
    5,
  );
  TestValidator.predicate(
    "should have employee:view permission",
    updatedRole.permissions.includes("employee:view"),
  );
  TestValidator.predicate(
    "should have employee:manage permission",
    updatedRole.permissions.includes("employee:manage"),
  );
  TestValidator.predicate(
    "should have project:view permission",
    updatedRole.permissions.includes("project:view"),
  );
  TestValidator.predicate(
    "should have project:manage permission",
    updatedRole.permissions.includes("project:manage"),
  );
  TestValidator.predicate(
    "should have time:approve permission",
    updatedRole.permissions.includes("time:approve"),
  );
  // Verify role id remains unchanged
  TestValidator.equals(
    "role id should remain the same",
    updatedRole.id,
    createdRole.id,
  );
  // Verify organization remains the same
  TestValidator.equals(
    "organization id should remain the same",
    updatedRole.organization.id,
    createdRole.organization.id,
  );
}
