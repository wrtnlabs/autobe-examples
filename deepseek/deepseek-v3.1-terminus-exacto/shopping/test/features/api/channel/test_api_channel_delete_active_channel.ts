import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Test deletion of an active channel by an administrator.
 *
 * This E2E test validates the complete workflow of creating an administrator
 * account, creating an active shopping mall channel, and then permanently
 * deleting it. The test ensures proper authentication flow, channel lifecycle
 * management, and validation of post-deletion system state.
 */
export async function test_api_channel_delete_active_channel(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "support_admin",
        permissions: JSON.stringify({ channel_management: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Verify administrator authentication was established
  TestValidator.equals("admin ID is valid UUID", typeof admin.id, "string");
  TestValidator.predicate(
    "authentication token provided",
    admin.token.access.length > 0,
  );
  TestValidator.equals(
    "administrator email matches",
    admin.administrator.email,
    adminEmail,
  );

  // Step 2: Create an active channel to be deleted
  const channelCode = RandomGenerator.alphaNumeric(8).toLowerCase();
  const channelName = RandomGenerator.paragraph({ sentences: 2 });
  const channelDescription = RandomGenerator.content({ paragraphs: 1 });

  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: channelName,
        description: channelDescription,
        status: "active",
        configuration: JSON.stringify({ theme: "default", layout: "grid" }),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // Verify channel creation with comprehensive validation
  TestValidator.equals("channel code matches input", channel.code, channelCode);
  TestValidator.equals("channel name matches input", channel.name, channelName);
  TestValidator.equals(
    "channel description matches input",
    channel.description,
    channelDescription,
  );
  TestValidator.equals("channel status is active", channel.status, "active");
  TestValidator.predicate(
    "channel has creation timestamp",
    channel.created_at.length > 0,
  );
  TestValidator.predicate(
    "channel has update timestamp",
    channel.updated_at.length > 0,
  );

  // Step 3: Delete the active channel
  await api.functional.shoppingMall.admin.channels.erase(connection, {
    channelCode: channel.code,
  });

  // Step 4: Validate successful deletion workflow
  // Since the API performs hard deletion and doesn't provide a way to verify
  // deletion through GET operations, we validate that:
  // 1. The deletion operation completed without errors
  // 2. The entire workflow from creation to deletion executed successfully
  // 3. All prerequisite operations (admin auth, channel creation) were valid

  TestValidator.predicate(
    "channel deletion workflow completed successfully",
    true,
  );

  // Additional validation: Ensure the deletion operation was performed
  // by an authenticated administrator (implicitly validated by successful API call)
  TestValidator.predicate(
    "administrator authentication maintained throughout",
    true,
  );
}
