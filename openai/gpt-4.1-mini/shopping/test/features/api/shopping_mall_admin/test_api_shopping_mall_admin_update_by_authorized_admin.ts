import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_shopping_mall_admin_update_by_authorized_admin(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin by joining a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://www.example.com/admin/join",
        referrer: "https://www.example.com/admin",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // 2. Create a new shopping mall admin account to be updated
  const targetAdminEmail = typia.random<string & tags.Format<"email">>();
  const targetAdminPassword = RandomGenerator.alphaNumeric(12);
  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      {
        body: {
          email: targetAdminEmail,
          password: targetAdminPassword,
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(createdAdmin);

  // 3. Update the created admin's email and password
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPassword = RandomGenerator.alphaNumeric(14);

  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.update(
      connection,
      {
        shoppingMallAdminId: createdAdmin.id,
        body: {
          email: updatedEmail,
          password: updatedPassword,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);

  // 4. Validate update correctness
  TestValidator.equals(
    "updated admin id should match",
    updatedAdmin.id,
    createdAdmin.id,
  );
  TestValidator.equals(
    "updated admin email should match",
    updatedAdmin.email,
    updatedEmail,
  );
}
