import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * E2E: Admin retrieves permission details by global code.
 *
 * Business scenario:
 *
 * - An administrator registers via /auth/admin/join and obtains an authenticated
 *   context (Authorization header automatically attached to the shared
 *   connection).
 * - The admin then creates a new RBAC permission via
 *   /shoppingMall/admin/adminPermissions, specifying a globally unique
 *   permission code, human-readable name, description, category, and is_system
 *   flag.
 * - Finally, the admin fetches the permission details via GET
 *   /shoppingMall/admin/adminPermissions/{adminPermissionCode}, using the same
 *   permission code as a path parameter.
 *
 * Validation goals:
 *
 * 1. The authenticated admin can successfully create a permission and then
 *    retrieve it by its `code`.
 * 2. The detail endpoint returns an IShoppingMallAdminPermission object whose `id`
 *    and all user-controlled fields (code, name, description, category,
 *    is_system) match the created record.
 * 3. Lifecycle fields (created_at, updated_at, deleted_at) are present and
 *    type-correct, with deleted_at being null/undefined for a freshly created
 *    permission.
 */
export async function test_api_admin_permission_detail_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip:
      Math.random() < 0.5
        ? typia.random<string & tags.Format<"ipv4">>()
        : typia.random<string & tags.Format<"ipv6">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new admin permission with a unique code.
  const randomSuffix = RandomGenerator.alphaNumeric(16);
  const permissionCode = `e2e.permission.${randomSuffix}`;

  const createPermissionBody = {
    code: permissionCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category: "configuration",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createPermissionBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // 3. Retrieve the permission by its global code via the detail endpoint.
  const fetchedPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert<IShoppingMallAdminPermission>(fetchedPermission);

  // 4. Business assertions: created vs fetched must match.
  TestValidator.equals(
    "permission id should be stable between create and fetch",
    fetchedPermission.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "permission code should match requested code",
    fetchedPermission.code,
    permissionCode,
  );
  TestValidator.equals(
    "permission name should be preserved",
    fetchedPermission.name,
    createPermissionBody.name,
  );
  TestValidator.equals(
    "permission description should be preserved",
    fetchedPermission.description,
    createPermissionBody.description,
  );
  TestValidator.equals(
    "permission category should be preserved",
    fetchedPermission.category,
    createPermissionBody.category,
  );
  TestValidator.equals(
    "permission is_system flag should be preserved",
    fetchedPermission.is_system,
    createPermissionBody.is_system,
  );

  // 5. Lifecycle field sanity checks.
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof fetchedPermission.created_at === "string" &&
      fetchedPermission.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof fetchedPermission.updated_at === "string" &&
      fetchedPermission.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for newly created permission",
    fetchedPermission.deleted_at === null ||
      fetchedPermission.deleted_at === undefined,
  );
}
