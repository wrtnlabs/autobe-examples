import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function test_api_notification_template_delete_unauthorized_non_admin(
  connection: api.IConnection,
) {
  // Prerequisite: Create an admin account to establish admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "admin123";
  const adminFirstName: string = RandomGenerator.name();
  const adminLastName: string = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: "full_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Create an unauthenticated connection by copying the base connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Generate a random valid templateId (UUID format)
  const templateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Verify that unauthorized (non-admin) request to delete template fails
  await TestValidator.error(
    "Unauthorized request to delete notification template should fail",
    async () => {
      await api.functional.shoppingMall.admin.notifications.templates.erase(
        unauthConn,
        {
          templateId: templateId,
        },
      );
    },
  );
}
