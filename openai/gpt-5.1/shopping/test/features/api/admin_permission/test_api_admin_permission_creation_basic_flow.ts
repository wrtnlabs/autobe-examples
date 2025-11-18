import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate basic admin permission creation and retrieval flow.
 *
 * Business goal:
 *
 * - Ensure that a newly joined administrator can create a permission via POST
 *   /shoppingMall/admin/adminPermissions.
 * - Ensure that the created permission can be re-fetched by its `code` via GET
 *   /shoppingMall/admin/adminPermissions/{adminPermissionCode} and that key
 *   fields persist exactly.
 *
 * Steps:
 *
 * 1. Join as a new admin using POST /auth/admin/join to obtain an authenticated
 *    admin context (token is auto-bound to connection).
 * 2. Create a new admin permission with a unique `code` and explicit `name`,
 *    `description`, `category`, and `is_system` fields.
 * 3. Assert the creation response matches the input and has a valid UUID id and
 *    date-time timestamps, with `deleted_at` unset.
 * 4. Re-fetch the permission via its `code` and assert that the fetched record
 *    matches the created one.
 */
export async function test_api_admin_permission_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as a new administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.test.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test.local" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare unique permission creation payload
  const permissionCodeBase = `orders.manage.${RandomGenerator.alphaNumeric(8)}`;
  const permissionCreateBody = {
    code: permissionCodeBase,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  // 3. Create the admin permission
  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: permissionCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // Basic field equality checks between request and response
  TestValidator.equals(
    "created permission code matches input",
    createdPermission.code,
    permissionCreateBody.code,
  );
  TestValidator.equals(
    "created permission name matches input",
    createdPermission.name,
    permissionCreateBody.name,
  );
  TestValidator.equals(
    "created permission description matches input",
    createdPermission.description ?? null,
    permissionCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created permission category matches input",
    createdPermission.category ?? null,
    permissionCreateBody.category ?? null,
  );
  TestValidator.equals(
    "created permission is_system matches input",
    createdPermission.is_system,
    permissionCreateBody.is_system,
  );

  // id must be a non-empty UUID string - typia.assert already validates format,
  // but we additionally ensure it's non-empty.
  TestValidator.predicate(
    "created permission id is non-empty",
    () => (createdPermission.id as string).length > 0,
  );

  // created_at and updated_at should be valid date-time, validated by typia,
  // but also logically non-empty.
  TestValidator.predicate(
    "created permission created_at is non-empty",
    () => createdPermission.created_at.length > 0,
  );
  TestValidator.predicate(
    "created permission updated_at is non-empty",
    () => createdPermission.updated_at.length > 0,
  );

  // deleted_at should be null or undefined on fresh creation.
  TestValidator.equals(
    "created permission deleted_at is null or undefined",
    createdPermission.deleted_at ?? null,
    null,
  );

  // 4. Re-fetch the permission via its code
  const fetchedPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: createdPermission.code,
    });
  typia.assert<IShoppingMallAdminPermission>(fetchedPermission);

  // 5. Confirm fetched permission equals created permission (field-by-field)
  TestValidator.equals(
    "fetched permission id equals created permission id",
    fetchedPermission.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "fetched permission code equals created permission code",
    fetchedPermission.code,
    createdPermission.code,
  );
  TestValidator.equals(
    "fetched permission name equals created permission name",
    fetchedPermission.name,
    createdPermission.name,
  );
  TestValidator.equals(
    "fetched permission description equals created permission description",
    fetchedPermission.description ?? null,
    createdPermission.description ?? null,
  );
  TestValidator.equals(
    "fetched permission category equals created permission category",
    fetchedPermission.category ?? null,
    createdPermission.category ?? null,
  );
  TestValidator.equals(
    "fetched permission is_system equals created permission is_system",
    fetchedPermission.is_system,
    createdPermission.is_system,
  );
  TestValidator.equals(
    "fetched permission deleted_at equals created permission deleted_at",
    fetchedPermission.deleted_at ?? null,
    createdPermission.deleted_at ?? null,
  );

  // Timestamps should generally match; this validates persistence behavior.
  TestValidator.equals(
    "fetched permission created_at equals created permission created_at",
    fetchedPermission.created_at,
    createdPermission.created_at,
  );
  TestValidator.equals(
    "fetched permission updated_at equals created permission updated_at",
    fetchedPermission.updated_at,
    createdPermission.updated_at,
  );
}
