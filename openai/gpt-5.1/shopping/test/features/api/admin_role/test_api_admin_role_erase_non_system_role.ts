import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_erase_non_system_role(
  connection: api.IConnection,
) {
  // 1. Register an admin so that we have an authorized admin principal.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a non-system admin role with a deterministic code.
  const roleCreateBody = {
    code: "temp_admin",
    name: "Temporary Admin",
    description: "Role used for temporary operations",
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Basic sanity checks on created role.
  TestValidator.equals(
    "created role code matches input",
    createdRole.code,
    roleCreateBody.code,
  );
  TestValidator.equals(
    "created role is marked as non-system",
    createdRole.is_system,
    roleCreateBody.is_system,
  );

  // 3. Erase the role by its business code.
  const erasedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.erase(connection, {
      adminRoleCode: roleCreateBody.code,
    });
  typia.assert<IShoppingMallAdminRole>(erasedRole);

  // 4. Validate erase invariants: id and code must remain stable, is_system stays false.
  TestValidator.equals(
    "erased role id should match created role id",
    erasedRole.id,
    createdRole.id,
  );
  TestValidator.equals(
    "erased role code should match created role code",
    erasedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "erased role is still non-system",
    erasedRole.is_system,
    false,
  );

  // If logical deletion is implemented, deleted_at is expected to be non-null after erase.
  // However, we do not hard-require it to change value to stay compatible with potential
  // hard-delete or different lifecycle implementations. Instead, we only assert that the
  // property exists with a nullable type via typia.assert above. Any stronger behavior
  // checks would depend on additional list/lookup APIs that we do not have here.
}
