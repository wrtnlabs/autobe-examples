import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

/**
 * Verify the admin user can delete a child channel under a parent channel.
 *
 * This test covers a full scenario where an admin user signs up, then creates a
 * parent channel, followed by a child channel under it. The test then deletes
 * the child channel and validates that it no longer exists.
 *
 * It also verifies that unauthorized deletion requests fail.
 */
export async function test_api_admin_channel_child_channel_deletion(
  connection: api.IConnection,
) {
  // 1. Admin user joins and obtains authentication token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securepassword",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a parent channel
  const parentChannelCode = `ch_${RandomGenerator.alphaNumeric(6)}`;
  const parentChannelName = RandomGenerator.name();
  const parentChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        parent_channel_id: null,
        channel_code: parentChannelCode,
        channel_name: parentChannelName,
        description: null,
      } satisfies IShoppingMallChannelDefinition.ICreate,
    });
  typia.assert(parentChannel);
  TestValidator.equals(
    "parent channel code matches",
    parentChannel.channel_code,
    parentChannelCode,
  );
  TestValidator.equals(
    "parent channel name matches",
    parentChannel.channel_name,
    parentChannelName,
  );

  // 3. Create a child channel under the parent channel
  const childChannelCode = `ch_${RandomGenerator.alphaNumeric(6)}`;
  const childChannelName = RandomGenerator.name();
  const childChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.children.create(
      connection,
      {
        channelCode: parentChannelCode,
        body: {
          parent_channel_id: parentChannel.id,
          channel_code: childChannelCode,
          channel_name: childChannelName,
          description: null,
        } satisfies IShoppingMallChannelDefinition.ICreate,
      },
    );
  typia.assert(childChannel);
  TestValidator.equals(
    "child channel code matches",
    childChannel.channel_code,
    childChannelCode,
  );
  TestValidator.equals(
    "child channel parent id matches",
    childChannel.parent_channel_id,
    parentChannel.id,
  );

  // 4. Delete the child channel
  await api.functional.shoppingMall.admin.channels.children.eraseChildChannel(
    connection,
    {
      channelCode: parentChannelCode,
      childChannelCode: childChannelCode,
    },
  );

  // 5. Verify deletion - attempt to create the same child channel code again to ensure previous was deleted
  // This tests that the channel code can be reused, indicating successful deletion
  const recreatedChildChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.children.create(
      connection,
      {
        channelCode: parentChannelCode,
        body: {
          parent_channel_id: parentChannel.id,
          channel_code: childChannelCode,
          channel_name: childChannelName,
          description: null,
        } satisfies IShoppingMallChannelDefinition.ICreate,
      },
    );
  typia.assert(recreatedChildChannel);
  TestValidator.equals(
    "child channel code reused after deletion",
    recreatedChildChannel.channel_code,
    childChannelCode,
  );

  // 6. Negative test: deletion should fail for invalid channel codes
  await TestValidator.error(
    "deleting with invalid parent channel code should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.children.eraseChildChannel(
        connection,
        {
          channelCode: "invalid_code",
          childChannelCode: childChannelCode,
        },
      );
    },
  );

  await TestValidator.error(
    "deleting with invalid child channel code should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.children.eraseChildChannel(
        connection,
        {
          channelCode: parentChannelCode,
          childChannelCode: "invalid_child_code",
        },
      );
    },
  );

  // 7. Negative test: deletion should fail when unauthenticated (simulate by resetting connection headers)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deleting child channel unauthorized should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.children.eraseChildChannel(
        unauthConnection,
        {
          channelCode: parentChannelCode,
          childChannelCode: childChannelCode,
        },
      );
    },
  );
}
