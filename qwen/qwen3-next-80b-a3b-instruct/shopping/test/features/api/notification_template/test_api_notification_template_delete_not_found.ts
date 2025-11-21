import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_notification_template_delete_not_found(
  connection: api.IConnection,
) {
  // Authenticate as admin to establish authorization context
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Generate a non-existent notification template UUID
  const nonExistentTemplateId = typia.random<string & tags.Format<"uuid">>();

  // Test deletion of a non-existent template should result in 404 error
  await TestValidator.error(
    "deleting non-existent template should return 404",
    async () => {
      await api.functional.shoppingMall.admin.notifications.templates.erase(
        connection,
        {
          templateId: nonExistentTemplateId,
        },
      );
    },
  );
}
