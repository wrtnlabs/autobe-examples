import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPermission";

export async function test_api_shopping_mall_permission_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin user by joining
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "P@ssw0rd!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://localhost/auth/admin/join",
        referrer: "https://localhost",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall permission with a unique name and label
  const permissionName = `perm_${RandomGenerator.alphaNumeric(8)}`;
  const permissionLabel = `Permission ${RandomGenerator.alphaNumeric(6)}`;
  const permissionDescription = `Description for ${permissionLabel}`;

  const permission: IShoppingMallPermission =
    await api.functional.shoppingMall.admin.shoppingMallPermissions.create(
      connection,
      {
        body: {
          name: permissionName,
          label: permissionLabel,
          description: permissionDescription,
        } satisfies IShoppingMallPermission.ICreate,
      },
    );
  typia.assert(permission);

  // 3. Verify that the returned permission object matches the input
  TestValidator.equals(
    "permission.name should match input",
    permission.name,
    permissionName,
  );
  TestValidator.equals(
    "permission.label should match input",
    permission.label,
    permissionLabel,
  );
  if (permission.description === null || permission.description === undefined) {
    throw new Error("permission.description should not be null or undefined");
  }
  TestValidator.equals(
    "permission.description should match input",
    permission.description,
    permissionDescription,
  );

  // 4. Verify id is a UUID
  TestValidator.predicate(
    "permission.id should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      permission.id,
    ),
  );

  // 5. Verify created_at and updated_at are ISO 8601 date-time strings
  TestValidator.predicate(
    "permission.created_at should be ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      permission.created_at,
    ),
  );
  TestValidator.predicate(
    "permission.updated_at should be ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      permission.updated_at,
    ),
  );
}
