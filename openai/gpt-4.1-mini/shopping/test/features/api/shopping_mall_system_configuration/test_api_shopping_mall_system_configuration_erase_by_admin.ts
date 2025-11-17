import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfiguration";

export async function test_api_shopping_mall_system_configuration_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongP@ssw0rd",
        ip: null,
        href: "https://localhost/auth/admin/join",
        referrer: "https://localhost/",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create shopping mall system configuration
  const requestBody = {
    key: RandomGenerator.alphaNumeric(10),
    value: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallSystemConfiguration.ICreate;

  const createdConfig: IShoppingMallSystemConfiguration =
    await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.create(
      connection,
      { body: requestBody },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "created configuration key matches",
    createdConfig.key,
    requestBody.key,
  );
  TestValidator.equals(
    "created configuration value matches",
    createdConfig.value,
    requestBody.value,
  );
  TestValidator.equals(
    "created configuration description matches",
    createdConfig.description,
    requestBody.description,
  );

  // 3. Delete the created configuration
  await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.erase(
    connection,
    {
      shoppingMallSystemConfigurationId: createdConfig.id,
    },
  );

  // 4. Try to delete again to confirm resource is gone -> expecting failure
  await TestValidator.error(
    "deleting non-existent configuration fails",
    async () => {
      await api.functional.shoppingMall.admin.shoppingMallSystemConfigurations.erase(
        connection,
        {
          shoppingMallSystemConfigurationId: createdConfig.id,
        },
      );
    },
  );
}
