import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_roles_create } from "../../../generate/generate_random_erp_hrm_admin_roles_create";
import { generate_random_erp_hrm_admin_roles_permissions_assign_permission } from "../../../generate/generate_random_erp_hrm_admin_roles_permissions_assign_permission";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";

export async function test_api_role_permission_assignment_to_custom_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to get JWT token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Create a custom role with project:view permission
  const customRole = await generate_random_erp_hrm_admin_roles_create(
    adminConnection,
    {
      body: {
        name: `TestRole_${RandomGenerator.alphaNumeric(8)}`,
        permissions: ["project:view"],
      } satisfies IErpHrmRole.ICreate,
    },
  );
  typia.assert(customRole);
  const initialPermissionsCount = customRole.rolePermissions.length;
  const initialRoleId = customRole.id;
  // 3. Assign employee:view permission to the custom role
  const rolePermission =
    await generate_random_erp_hrm_admin_roles_permissions_assign_permission(
      adminConnection,
      {
        params: {
          roleId: customRole.id,
        },
        body: {
          permission: "employee:view",
        } satisfies IErpHrmRolePermission.ICreate,
      },
    );
  typia.assert(rolePermission);
  // 4. Validate the response
  TestValidator.equals(
    "permission should be employee:view",
    rolePermission.permission,
    "employee:view",
  );
  TestValidator.equals(
    "role id should match the created role",
    rolePermission.role.id,
    initialRoleId,
  );
  TestValidator.predicate(
    "createdAt should exist",
    rolePermission.createdAt !== undefined && rolePermission.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt should exist",
    rolePermission.updatedAt !== undefined && rolePermission.updatedAt !== null,
  );
  TestValidator.equals(
    "permissions count should increase by 1",
    rolePermission.role.permissionsCount,
    initialPermissionsCount + 1,
  );
}
