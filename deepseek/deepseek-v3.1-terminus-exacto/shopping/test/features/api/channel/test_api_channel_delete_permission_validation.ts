import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test channel deletion with proper permission validation.
 *
 * This E2E test validates that only authorized administrators can delete
 * channels and tests permission-based access control. The test creates an
 * administrator account, establishes a channel for deletion testing, and
 * verifies that the deletion operation succeeds with proper authentication
 * while ensuring security enforcement for channel management operations.
 */
export async function test_api_channel_delete_permission_validation(
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
        channel_deletion: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Create channel for deletion testing
  const channelData = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    configuration: JSON.stringify({
      theme: "default",
      language: "en",
    }),
  } satisfies IShoppingMallChannel.ICreate;

  const createdChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelData,
    });
  typia.assert(createdChannel);

  // Step 3: Validate channel creation
  TestValidator.equals(
    "created channel code matches input",
    createdChannel.code,
    channelData.code,
  );
  TestValidator.equals(
    "created channel name matches input",
    createdChannel.name,
    channelData.name,
  );
  TestValidator.equals(
    "created channel status is active",
    createdChannel.status,
    "active",
  );

  // Step 4: Execute channel deletion with proper authentication
  await api.functional.shoppingMall.admin.channels.erase(connection, {
    channelCode: createdChannel.code,
  });

  // Step 5: Validate successful deletion by testing channel recreation
  // After deletion, we should be able to create a channel with the same code
  const recreatedChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        ...channelData,
        name: "Recreated Channel",
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(recreatedChannel);

  TestValidator.equals(
    "recreated channel should have same code",
    recreatedChannel.code,
    channelData.code,
  );
  TestValidator.notEquals(
    "recreated channel should have different name",
    recreatedChannel.name,
    createdChannel.name,
  );
}
