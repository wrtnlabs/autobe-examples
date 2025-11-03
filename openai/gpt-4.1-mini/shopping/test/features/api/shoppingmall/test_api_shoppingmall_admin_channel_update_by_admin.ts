import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

/**
 * Test the update of a shopping mall admin channel by an admin user.
 *
 * This test follows these steps:
 *
 * 1. Registers an admin user via /auth/admin/join to obtain authorized
 *    credentials.
 * 2. Updates a specific channel identified by channelCode with new channel_name,
 *    description, and parent_channel_id.
 * 3. Validates that the update response correctly reflects the modifications.
 * 4. Attempts updating the channel without authentication and expects failure.
 */
export async function test_api_shoppingmall_admin_channel_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain authentication tokens
  const adminJoinBody = {
    email: `admin${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "SecureP@ssword123", // fixed valid password
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Prepare update data with new name, description, and null parent (top-level)
  const updateBody = {
    channel_code: "channel-001", // required channel code duplicate for consistency
    channel_name: `Updated Channel ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: `Updated description ${RandomGenerator.content({ paragraphs: 1 })}`,
    parent_channel_id: null,
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallChannelDefinition.IUpdate;

  // 3. Call the update function with authorized connection
  const updatedChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.update(connection, {
      channelCode: updateBody.channel_code,
      body: updateBody,
    });
  typia.assert(updatedChannel);

  TestValidator.equals(
    "channel_code updated correctly",
    updatedChannel.channel_code,
    updateBody.channel_code,
  );

  TestValidator.equals(
    "channel_name updated correctly",
    updatedChannel.channel_name,
    updateBody.channel_name,
  );

  TestValidator.equals(
    "description updated correctly",
    updatedChannel.description,
    updateBody.description,
  );

  TestValidator.equals(
    "parent_channel_id updated correctly",
    updatedChannel.parent_channel_id,
    updateBody.parent_channel_id,
  );

  // 4. Attempt update without authentication (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.update(
        unauthenticatedConnection,
        {
          channelCode: updateBody.channel_code,
          body: updateBody,
        },
      );
    },
  );
}
