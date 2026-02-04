import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_system_configuration_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 2: Generate a valid UUID for configurationId since no endpoint to retrieve config is provided
  // As per system design, a configuration must already exist - likely created on server startup
  // We will use a valid UUID format to satisfy the API schema requirement
  // In practice, the system should have at least one configuration created during initial setup
  const configurationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Prepare update data with valid values
  const updateData: IShoppingMallConfiguration.IUpdate = {
    value: "EUR" satisfies string,
    description: "Updated currency to Euro for international operations",
  } satisfies IShoppingMallConfiguration.IUpdate;
  // Step 4: Perform the update operation using admin connection
  const updatedConfiguration: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.putByConfigurationid(
      adminConnection, // ✅ Use admin connection, NOT base connection
      {
        configurationId: configurationId,
        body: updateData,
      },
    );
  typia.assert(updatedConfiguration);
  // Step 5: Validate the response contains updated fields
  TestValidator.equals(
    "currency updated to EUR",
    updatedConfiguration.currency,
    "EUR",
  );
  // Validate that updated_at timestamp was modified (should be newer than created_at)
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedConfiguration.updated_at).getTime() >
      new Date(updatedConfiguration.created_at).getTime(),
  );
}
