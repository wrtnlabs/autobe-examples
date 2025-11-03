import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

/**
 * Test updating an existing child channel under a parent channel as an admin
 * user.
 *
 * This test covers:
 *
 * 1. Admin registration and authentication
 * 2. Creating a parent shopping mall channel
 * 3. Creating a child channel under the parent
 * 4. Updating the child channel's name and optional description
 * 5. Validating the update's success and data consistency
 *
 * Each step asserts the response type with typia.assert, and validates business
 * logic constraints using TestValidator for strict correctness.
 */
export async function test_api_shopping_mall_admin_channels_children_update_child_channel(
  connection: api.IConnection,
) {
  // 1. Admin registration and join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin-password-123",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "admin authorization token exists",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create a parent channel
  const parentChannelCode = `parent_${RandomGenerator.alphabets(6)}`;
  const parentChannelCreateBody = {
    channel_code: parentChannelCode,
    channel_name: RandomGenerator.name(2),
    description: "Parent channel for testing",
  } satisfies IShoppingMallChannelDefinition.ICreate;

  const parentChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: parentChannelCreateBody,
    });
  typia.assert(parentChannel);
  TestValidator.equals(
    "parent channel code matches",
    parentChannel.channel_code,
    parentChannelCode,
  );

  // 3. Create a child channel under the parent
  const childChannelCode = `child_${RandomGenerator.alphabets(6)}`;
  const childChannelCreateBody = {
    parent_channel_id: parentChannel.id,
    channel_code: childChannelCode,
    channel_name: RandomGenerator.name(2),
    description: "Child channel created for update test",
  } satisfies IShoppingMallChannelDefinition.ICreate;

  const childChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.children.create(
      connection,
      {
        channelCode: parentChannelCode,
        body: childChannelCreateBody,
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

  // 4. Update the child channel (name and optionally description)
  const updatedName = RandomGenerator.name(3);
  const updatedDescription = "Updated description for child channel";
  const updateBody = {
    channel_code: childChannelCode, // required immutable code
    channel_name: updatedName,
    description: updatedDescription,
  } satisfies IShoppingMallChannelDefinition.IUpdate;

  const updatedChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.children.updateChildChannel(
      connection,
      {
        channelCode: parentChannelCode,
        childChannelCode: childChannelCode,
        body: updateBody,
      },
    );
  typia.assert(updatedChannel);

  // 5. Validate the update
  TestValidator.equals(
    "updated channel code remains same",
    updatedChannel.channel_code,
    childChannelCode,
  );
  TestValidator.equals(
    "updated channel name is correct",
    updatedChannel.channel_name,
    updatedName,
  );
  TestValidator.equals(
    "updated channel description is correct",
    updatedChannel.description,
    updatedDescription,
  );

  TestValidator.notEquals(
    "channel name changed from original",
    childChannel.channel_name,
    updatedChannel.channel_name,
  );

  TestValidator.notEquals(
    "channel description changed from original",
    childChannel.description,
    updatedChannel.description,
  );
}
