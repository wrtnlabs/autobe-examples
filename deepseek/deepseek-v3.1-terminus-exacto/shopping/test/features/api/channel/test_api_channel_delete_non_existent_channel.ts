import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";

/**
 * Test deletion attempt on a non-existent channel.
 *
 * Validates proper error handling and response when targeting invalid channel
 * codes. Tests system resilience against invalid deletion requests by
 * authenticated administrators.
 */
export async function test_api_channel_delete_non_existent_channel(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({
        channel_management: ["read", "delete"],
        user_management: ["read"],
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a random channel code that does not exist
  const nonExistentChannelCode = RandomGenerator.alphaNumeric(8);

  // Step 3: Attempt to delete non-existent channel and validate error
  await TestValidator.error(
    "deletion of non-existent channel should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.erase(connection, {
        channelCode: nonExistentChannelCode,
      });
    },
  );
}
