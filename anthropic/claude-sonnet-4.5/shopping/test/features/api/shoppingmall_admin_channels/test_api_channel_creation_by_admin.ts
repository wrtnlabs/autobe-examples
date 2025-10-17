import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test complete sales channel creation workflow by administrator.
 *
 * This test validates the end-to-end process of an administrator creating a new
 * sales channel in the shopping mall platform. Sales channels represent
 * distinct distribution methods through which products are sold to customers,
 * each with its own configuration.
 *
 * Test workflow:
 *
 * 1. Create and authenticate admin account with proper role
 * 2. Generate unique channel configuration data
 * 3. Create sales channel through admin API
 * 4. Validate channel creation response and data integrity
 * 5. Verify all configuration parameters are correctly stored
 */
export async function test_api_channel_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@12345";
  const adminName = RandomGenerator.name();
  const adminRoleLevel = "super_admin";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: adminRoleLevel,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  typia.assert(admin);

  // Verify admin authentication response structure
  TestValidator.predicate(
    "admin should have valid ID",
    admin.id !== undefined && admin.id.length > 0,
  );
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.equals("admin name matches input", admin.name, adminName);
  TestValidator.equals(
    "admin role matches input",
    admin.role_level,
    adminRoleLevel,
  );
  TestValidator.predicate(
    "admin should have access token",
    admin.token.access !== undefined && admin.token.access.length > 0,
  );

  // Step 2: Generate unique channel configuration data
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelName = `${RandomGenerator.name(2)} Channel`;

  // Step 3: Create sales channel through admin API
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        channel_code: channelCode,
        channel_name: channelName,
      } satisfies IShoppingMallChannel.ICreate,
    },
  );

  typia.assert(channel);

  // Step 4: Validate channel creation response
  TestValidator.predicate(
    "channel should have generated UUID",
    channel.id !== undefined && channel.id.length === 36,
  );
  TestValidator.equals(
    "channel code matches input",
    channel.channel_code,
    channelCode,
  );
  TestValidator.equals(
    "channel name matches input",
    channel.channel_name,
    channelName,
  );

  // Step 5: Verify channel data integrity
  TestValidator.predicate(
    "channel code should be non-empty",
    channel.channel_code.length > 0,
  );
  TestValidator.predicate(
    "channel name should be non-empty",
    channel.channel_name.length > 0,
  );
}
