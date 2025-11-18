import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate calling the admin permission update endpoint preserves identity
 * fields and is reachable in an authenticated admin context.
 *
 * Business focus
 *
 * - Ensure that an authenticated admin can:
 *
 *   1. Join the platform and obtain an authorization context.
 *   2. Create a new admin permission with a stable code.
 *   3. Call the update endpoint for that permission without errors.
 *   4. Re-read the permission and observe that immutable identity fields (id, code,
 *        is_system, created_at) are unchanged.
 *
 * Technical notes
 *
 * - The generated SDK for `update` exposes only a path parameter and returns
 *   void, with no typed request body. Therefore we cannot send an
 *   IShoppingMallAdminPermission.IUpdate payload from this test. The scenario
 *   is thus adapted to validate successful invocation and identity stability
 *   rather than changed mutable fields.
 * - All non-void responses are checked by `typia.assert` to ensure full
 *   structural correctness.
 * - Field-level invariants are asserted using `TestValidator.equals`.
 */
export async function test_api_admin_permission_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Join as an admin to establish Authorization header context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline permission with a specific code
  const permissionCode = "catalog.products.block";
  const createBody = {
    code: permissionCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "catalog",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const created: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Reload immediately to normalize any server-side defaults
  const before: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert(before);

  TestValidator.equals(
    "created and reloaded permission ids must match",
    before.id,
    created.id,
  );
  TestValidator.equals(
    "created and reloaded permission codes must match",
    before.code,
    created.code,
  );

  // 4. Call the update endpoint (side-effect only, no body available in SDK)
  await api.functional.shoppingMall.admin.adminPermissions.update(connection, {
    adminPermissionCode: permissionCode,
  });

  // 5. Reload after update and validate identity stability
  const after: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert(after);

  // Identity and system fields should remain stable
  TestValidator.equals(
    "permission id must remain stable after update",
    after.id,
    before.id,
  );
  TestValidator.equals(
    "permission code must remain stable after update",
    after.code,
    before.code,
  );
  TestValidator.equals(
    "is_system flag must remain stable after update",
    after.is_system,
    before.is_system,
  );
  TestValidator.equals(
    "created_at must remain stable after update",
    after.created_at,
    before.created_at,
  );
  TestValidator.equals(
    "deleted_at must remain stable after update",
    after.deleted_at ?? null,
    before.deleted_at ?? null,
  );

  // Since we cannot control the update body, we expect name/description/category
  // to remain as they were before.
  TestValidator.equals(
    "name must remain unchanged when update body is not provided by SDK",
    after.name,
    before.name,
  );
  TestValidator.equals(
    "description must remain unchanged when update body is not provided by SDK",
    after.description ?? null,
    before.description ?? null,
  );
  TestValidator.equals(
    "category must remain unchanged when update body is not provided by SDK",
    after.category ?? null,
    before.category ?? null,
  );
}
