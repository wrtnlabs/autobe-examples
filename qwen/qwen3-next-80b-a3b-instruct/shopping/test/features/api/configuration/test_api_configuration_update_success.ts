import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_configuration_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create superAdmin connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Use a random valid UUID as configurationId
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create update payload with valid string value and description
  const updatePayload: IShoppingMallConfiguration.IUpdate = {
    value: "updated_value" as string,
    description: "Test update",
  };
  // Step 4: Call the update endpoint with proper actor connection
  const updatedConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.superAdmin.configurations.putByConfigurationid(
      superAdminConnection,
      {
        configurationId,
        body: updatePayload,
      },
    );
  // Step 5: Validate the response
  typia.assert(updatedConfig);
}
