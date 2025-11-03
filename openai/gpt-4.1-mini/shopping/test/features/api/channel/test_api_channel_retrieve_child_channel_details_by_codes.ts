import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

export async function test_api_channel_retrieve_child_channel_details_by_codes(
  connection: api.IConnection,
) {
  // Step 1: Admin joins (creates an admin account)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Abcd1234",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Step 2: Create parent channel
  const parentChannelCode = `parent_${RandomGenerator.alphaNumeric(6)}`;
  const parentChannelCreateBody = {
    parent_channel_id: null,
    channel_code: parentChannelCode,
    channel_name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 7,
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallChannelDefinition.ICreate;

  const parentChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: parentChannelCreateBody,
    });
  typia.assert(parentChannel);
  TestValidator.equals(
    "parent channel code matches",
    parentChannel.channel_code,
    parentChannelCreateBody.channel_code,
  );

  // Step 3: Create child channel under the parent
  const childChannelCode = `child_${RandomGenerator.alphaNumeric(6)}`;
  const childChannelCreateBody = {
    parent_channel_id: parentChannel.id,
    channel_code: childChannelCode,
    channel_name: RandomGenerator.name(2),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 6,
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    "child channel's parent id matches parent's id",
    childChannel.parent_channel_id,
    parentChannel.id,
  );
  TestValidator.equals(
    "child channel code matches",
    childChannel.channel_code,
    childChannelCreateBody.channel_code,
  );

  // Step 4: Retrieve child channel details with valid codes
  const retrievedChildChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.channels.children.at(connection, {
      channelCode: parentChannel.channel_code,
      childChannelCode: childChannel.channel_code,
    });
  typia.assert(retrievedChildChannel);

  TestValidator.equals(
    "retrieved child channel id matches created child",
    retrievedChildChannel.id,
    childChannel.id,
  );
  TestValidator.equals(
    "retrieved child channel parent_channel_id matches parent's id",
    retrievedChildChannel.parent_channel_id,
    parentChannel.id,
  );
  TestValidator.equals(
    "retrieved child channel code matches",
    retrievedChildChannel.channel_code,
    childChannel.channel_code,
  );
  TestValidator.equals(
    "retrieved child channel name matches",
    retrievedChildChannel.channel_name,
    childChannel.channel_name,
  );
  TestValidator.equals(
    "retrieved child channel description matches",
    retrievedChildChannel.description,
    childChannel.description,
  );

  // Step 5: Attempt retrieval with invalid parent channelCode
  await TestValidator.error(
    "retrieval with invalid parent channelCode should fail",
    async () => {
      await api.functional.shoppingMall.channels.children.at(connection, {
        channelCode: "nonexistent_parent",
        childChannelCode: childChannel.channel_code,
      });
    },
  );

  // Step 6: Attempt retrieval with invalid child channelCode
  await TestValidator.error(
    "retrieval with invalid child channelCode should fail",
    async () => {
      await api.functional.shoppingMall.channels.children.at(connection, {
        channelCode: parentChannel.channel_code,
        childChannelCode: "nonexistent_child",
      });
    },
  );
}
