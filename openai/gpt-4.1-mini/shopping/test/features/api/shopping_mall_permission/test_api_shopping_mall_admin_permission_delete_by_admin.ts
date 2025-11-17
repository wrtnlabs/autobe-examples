import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPermission";

export async function test_api_shopping_mall_admin_permission_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        ip: null,
        href: `https://localhost/admin/${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
        referrer: `https://localhost/referrer/${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall permission
  const permissionName = `perm_${RandomGenerator.alphaNumeric(10)}`;
  const permissionLabel = `Label ${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 })}`;
  const permissionDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 15,
  });

  const createdPermission: IShoppingMallPermission =
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
  typia.assert(createdPermission);

  // Validate created permission properties
  TestValidator.equals(
    "created permission name matches input",
    createdPermission.name,
    permissionName,
  );
  TestValidator.equals(
    "created permission label matches input",
    createdPermission.label,
    permissionLabel,
  );
  TestValidator.equals(
    "created permission description matches input",
    createdPermission.description ?? null,
    permissionDescription,
  );

  // 3. Delete the created permission
  await api.functional.shoppingMall.admin.shoppingMallPermissions.erase(
    connection,
    {
      name: permissionName,
    },
  );

  // 4. Verify deletion by attempting to delete the same permission again
  await TestValidator.error(
    "deleting already deleted permission should fail",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallPermissions.erase(
        connection,
        {
          name: permissionName,
        },
      );
    },
  );
}
