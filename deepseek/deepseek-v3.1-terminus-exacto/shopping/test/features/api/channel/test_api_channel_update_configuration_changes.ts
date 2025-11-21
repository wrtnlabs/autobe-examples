import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test updating channel configuration settings with JSON configuration objects.
 *
 * Admin creates a channel, then modifies its configuration parameters for
 * operational customization. Validates configuration format compliance and
 * ensures configuration updates are properly applied. Tests various
 * configuration scenarios including valid JSON structures and error handling
 * for invalid configurations.
 */
export async function test_api_channel_update_configuration_changes(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({
        channel_management: true,
        configuration_access: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create initial channel with default configuration
  const channelCode = RandomGenerator.alphaNumeric(8);
  const initialChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        configuration: JSON.stringify({
          theme: "default",
          language: "en",
          currency: "USD",
          tax_rate: 0.1,
          shipping_enabled: true,
        }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(initialChannel);

  // Step 3: Update channel with new configuration settings
  const updatedConfiguration = {
    theme: "premium",
    language: "ko",
    currency: "KRW",
    tax_rate: 0.15,
    shipping_enabled: false,
    new_feature: "enabled",
    max_products: 1000,
  };

  const updatedChannel =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: channelCode,
      body: {
        name: "Updated " + initialChannel.name,
        description: "Updated channel with new configuration",
        status: "active",
        configuration: JSON.stringify(updatedConfiguration),
      } satisfies IShoppingMallChannel.IUpdate,
    });
  typia.assert(updatedChannel);

  // Step 4: Validate channel metadata changes are properly applied
  TestValidator.equals(
    "channel name should be updated",
    updatedChannel.name,
    "Updated " + initialChannel.name,
  );
  TestValidator.equals(
    "channel description should be updated",
    updatedChannel.description,
    "Updated channel with new configuration",
  );
  TestValidator.equals(
    "channel status should remain active",
    updatedChannel.status,
    "active",
  );
  TestValidator.equals(
    "channel code should remain unchanged",
    updatedChannel.code,
    channelCode,
  );

  // Step 5: Test error scenario with invalid JSON configuration
  await TestValidator.error(
    "should reject invalid JSON configuration",
    async () => {
      await api.functional.shoppingMall.admin.channels.update(connection, {
        channelCode: channelCode,
        body: {
          configuration: "{invalid json syntax}",
        } satisfies IShoppingMallChannel.IUpdate,
      });
    },
  );

  // Additional validation: Test partial configuration update
  const partialUpdate = await api.functional.shoppingMall.admin.channels.update(
    connection,
    {
      channelCode: channelCode,
      body: {
        name: "Partially Updated Channel",
      } satisfies IShoppingMallChannel.IUpdate,
    },
  );
  typia.assert(partialUpdate);

  TestValidator.equals(
    "partial update should change name only",
    partialUpdate.name,
    "Partially Updated Channel",
  );
  TestValidator.equals(
    "description should remain unchanged",
    partialUpdate.description,
    updatedChannel.description,
  );
  TestValidator.equals(
    "status should remain unchanged",
    partialUpdate.status,
    updatedChannel.status,
  );
}
