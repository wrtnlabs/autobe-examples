import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate creation of an admin permission with fully populated optional
 * metadata and verify that it persists correctly via the read-back endpoint.
 *
 * Business process:
 *
 * 1. Register and authenticate an administrator using POST /auth/admin/join. This
 *    seeds a shopping mall admin account and configures the connection with an
 *    Authorization header for subsequent privileged admin operations.
 * 2. As that admin, create a new permission via POST
 *    /shoppingMall/admin/adminPermissions with an
 *    IShoppingMallAdminPermission.ICreate payload that includes:
 *
 *    - Code: a dot-namespaced identifier like "orders.refund.approve";
 *    - Name: a human-readable display label;
 *    - Description: a long explanatory paragraph;
 *    - Category: a grouping key such as "orders";
 *    - Is_system: explicitly true, to mark it as system-defined.
 * 3. Assert that the response echoes the key fields (code, name, description,
 *    category) and that is_system is true, not defaulted.
 * 4. Confirm lifecycle fields: created_at and updated_at are populated as ISO
 *    date-time strings and deleted_at is null/undefined for an active
 *    permission.
 * 5. Use GET /shoppingMall/admin/adminPermissions/{adminPermissionCode} with the
 *    same code to retrieve the permission, and assert that all business
 *    metadata and lifecycle expectations remain consistent, proving metadata
 *    survives round-trip persistence.
 */
export async function test_api_admin_permission_creation_with_optional_metadata(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain an authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new admin permission with all optional metadata populated
  const permissionCode = "orders.refund.approve";
  const permissionName = "Approve order refunds";
  const permissionDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 3,
    wordMax: 10,
  });
  const permissionCategory = "orders";

  const createBody = {
    code: permissionCode,
    name: permissionName,
    description: permissionDescription,
    category: permissionCategory,
    is_system: true,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const created: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Validate that business fields echo the inputs
  TestValidator.equals(
    "created permission code should match input code",
    created.code,
    permissionCode,
  );
  TestValidator.equals(
    "created permission name should match input name",
    created.name,
    permissionName,
  );
  TestValidator.equals(
    "created permission description should match input description",
    created.description,
    permissionDescription,
  );
  TestValidator.equals(
    "created permission category should match input category",
    created.category,
    permissionCategory,
  );
  TestValidator.equals(
    "created permission is_system should be true as explicitly set",
    created.is_system,
    true,
  );

  // 4. Lifecycle expectations: timestamps set, deleted_at null/undefined
  TestValidator.predicate(
    "created_at must be a non-empty ISO date-time string",
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty ISO date-time string",
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for a newly created permission",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 5. Read-back by code to ensure metadata persists and is retrievable
  const fetched: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert(fetched);

  // 6. Compare fetched record with the created one on key business fields
  TestValidator.equals(
    "fetched permission code should equal created code",
    fetched.code,
    created.code,
  );
  TestValidator.equals(
    "fetched permission name should equal created name",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "fetched permission description should equal created description",
    fetched.description,
    created.description,
  );
  TestValidator.equals(
    "fetched permission category should equal created category",
    fetched.category,
    created.category,
  );
  TestValidator.equals(
    "fetched permission is_system should remain true",
    fetched.is_system,
    created.is_system,
  );
  TestValidator.predicate(
    "fetched permission deleted_at should still be null or undefined",
    fetched.deleted_at === null || fetched.deleted_at === undefined,
  );
}
