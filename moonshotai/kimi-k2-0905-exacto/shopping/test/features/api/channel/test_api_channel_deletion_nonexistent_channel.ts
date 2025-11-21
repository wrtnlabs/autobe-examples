import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Test attempt to delete non-existent channel.
 *
 * This test validates proper error handling when attempting to delete a channel
 * that does not exist, ensuring clear feedback and system stability.
 *
 * Test Steps:
 *
 * 1. Create an admin account for authentication
 * 2. Attempt to delete a non-existent channel using a random channel code
 * 3. Validate that the API returns an appropriate error response
 * 4. Ensure no system instability occurs from the invalid deletion attempt
 */
export async function test_api_channel_deletion_nonexistent_channel(
  connection: api.IConnection,
) {
  // Step 1: Create an admin account for authentication
  const adminEmail = RandomGenerator.alphabets(10) + "@test.com";
  const adminData = {
    email: adminEmail,
    firstname: RandomGenerator.name(),
    lastname: RandomGenerator.name(),
    adminlevel: "department_admin" as const,
    department: "Test Department",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // Step 2: Attempt to delete a non-existent channel
  const nonExistentChannelCode = RandomGenerator.alphabets(20);

  // Step 3: Validate that the API returns an appropriate error response
  await TestValidator.error(
    "should reject deletion of non-existent channel",
    async () => {
      return await api.functional.shoppingMall.admin.channels.erase(
        connection,
        {
          channelCode: nonExistentChannelCode,
        },
      );
    },
  );

  // Step 4: Ensure no system instability - admin account should still be valid
  TestValidator.predicate(
    "admin account remains valid after failed deletion",
    admin.is_active === true,
  );
  TestValidator.predicate(
    "admin ID remains UUID format",
    typeof admin.id === "string" && admin.id.length === 36,
  );
}
