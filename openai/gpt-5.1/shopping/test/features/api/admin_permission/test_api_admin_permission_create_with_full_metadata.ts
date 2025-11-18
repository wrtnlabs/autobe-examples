import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate creation of an admin permission with full metadata and its
 * persistence.
 *
 * Business goals:
 *
 * - Ensure an admin can create a new RBAC permission using all optional metadata
 *   fields.
 * - Confirm that the created permission is returned with all fields populated as
 *   sent.
 * - Verify that a subsequent GET by permission code returns identical metadata
 *   (round-trip consistency).
 *
 * Scenario steps:
 *
 * 1. Register a new admin via POST /auth/admin/join, establishing an authenticated
 *    admin context.
 * 2. Build an IShoppingMallAdminPermission.ICreate payload with:
 *
 *    - Code: stable, dot-separated RBAC code (e.g., "catalog.products.block").
 *    - Name: human-readable permission name.
 *    - Description: rich text, multi-sentence content.
 *    - Category: logical module, e.g., "catalog".
 *    - Is_system: true, explicitly marking as system-defined.
 * 3. Call POST /shoppingMall/admin/adminPermissions to create the permission and
 *    validate the response:
 *
 *    - Typia.assert on the returned IShoppingMallAdminPermission.
 *    - Assert code, name, description, category, is_system match the request.
 * 4. Call GET /shoppingMall/admin/adminPermissions/{adminPermissionCode} using the
 *    same code.
 *
 *    - Typia.assert on the fetched IShoppingMallAdminPermission.
 *    - Assert id, code, name, description, category, is_system equal to the created
 *         permission.
 *    - Optionally assert created_at equality and updated_at monotonicity.
 */
export async function test_api_admin_permission_create_with_full_metadata(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join) to obtain an authenticated admin context.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Build full metadata payload for new permission.
  const permissionCode = "catalog.products.block";
  const permissionName = "Block Catalog Products";
  const permissionDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 10,
  });
  const permissionCategory = "catalog";

  const createBody = {
    code: permissionCode,
    name: permissionName,
    description: permissionDescription,
    category: permissionCategory,
    is_system: true,
  } satisfies IShoppingMallAdminPermission.ICreate;

  // 3. Create the permission.
  const created: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Validate fields against the request body.
  TestValidator.equals(
    "created permission code matches request",
    created.code,
    permissionCode,
  );
  TestValidator.equals(
    "created permission name matches request",
    created.name,
    permissionName,
  );
  TestValidator.equals(
    "created permission description matches request",
    created.description,
    permissionDescription,
  );
  TestValidator.equals(
    "created permission category matches request",
    created.category,
    permissionCategory,
  );
  TestValidator.equals(
    "created permission is_system matches request",
    created.is_system,
    true,
  );

  // Basic sanity on timestamps (non-empty strings); structural format is validated by typia.
  TestValidator.predicate(
    "created_at timestamp should be non-empty",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be non-empty",
    created.updated_at.length > 0,
  );

  // 4. Fetch the permission by code to verify persistence and round-trip consistency.
  const fetched: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert(fetched);

  // Core identity and metadata should match between created and fetched.
  TestValidator.equals(
    "fetched permission id matches created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched permission code matches created code",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "fetched permission name matches created name",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "fetched permission description matches created description",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "fetched permission category matches created category",
    fetched.category,
    created.category,
  );
  TestValidator.equals(
    "fetched permission is_system matches created is_system",
    fetched.is_system,
    created.is_system,
  );

  // created_at should be stable; updated_at should be >= created_at (lexicographically for ISO 8601).
  TestValidator.equals(
    "fetched created_at equals created created_at",
    fetched.created_at,
    created.created_at,
  );
  TestValidator.predicate(
    "fetched updated_at is not earlier than created updated_at",
    fetched.updated_at >= created.updated_at,
  );
}
