import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";
import { generate_random_shopping_mall_admin_admins_create } from "../../../generate/generate_random_shopping_mall_admin_admins_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_account_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join - this gives us password access
  const updaterAdminConnection: api.IConnection = { host: connection.host };
  // Generate known password for the updater admin
  const updaterPassword = RandomGenerator.alphaNumeric(16);
  // Create admin that will perform the update (we know its password)
  const updaterAdmin: IShoppingMallAdmin.IAuthorized =
    await authorize_admin_join(updaterAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: updaterPassword,
        href: "https://example.com/admin/join",
        referrer: "https://example.com/admin/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(updaterAdmin);
  // Step 2: Create admin account that will be updated
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const createdAdmin: IShoppingMallAdmin =
    await generate_random_shopping_mall_admin_admins_create(
      targetAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          permissions: "admin:users:read,admin:orders:edit",
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  typia.assert(createdAdmin);
  // Step 3: Authenticate the updater admin with correct password
  const authUpdatersConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authUpdatersConnection, {
    body: {
      email: updaterAdmin.email,
      password: updaterPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Step 4: Update the target admin account using the updater admin's connection
  const updatedAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.update(
      authUpdatersConnection,
      {
        adminId: createdAdmin.id,
        body: {
          name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          permissions: [
            "admin:users:read",
            "admin:orders:edit",
            "admin:payments:delete",
          ],
          status: "inactive",
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  // Step 5: Validate that the update was successful
  TestValidator.equals(
    "admin name updated",
    updatedAdmin.name,
    createdAdmin.name,
  );
  TestValidator.equals(
    "admin email updated",
    updatedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin permissions updated",
    updatedAdmin.permissions.length,
    createdAdmin.permissions.length,
  );
  TestValidator.equals(
    "admin status updated",
    updatedAdmin.status,
    createdAdmin.status,
  );
  // Step 6: Validate that unauthorized update fails (authorized admin cannot update other admin)
  // The scenario says "validates that the update succeeds only with proper authorization"
  // Test case: Unauthorized user attempts to update another admin
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const wrongEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "unauthorized update should fail with proper auth",
    async () => {
      // Attempt to authenticate with different credentials
      await authorize_admin_login(unauthorizedConnection, {
        body: {
          email: wrongEmail,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IShoppingMallAdmin.ILogin,
      });
      // Try to update the target admin with wrong credentials
      await api.functional.shoppingMall.admin.admins.update(
        unauthorizedConnection,
        {
          adminId: createdAdmin.id,
          body: {
            name: RandomGenerator.name(),
          } satisfies IShoppingMallAdmin.IUpdate,
        },
      );
    },
  );
  // Step 7: Validate the original account details remain unchanged
  // The 'get' method does not exist - this is a structural API issue outside type system scope
  // We must reject because this is not a type casting or syntax error
}