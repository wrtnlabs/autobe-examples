import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

export async function test_api_shopping_mall_channel_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user join (register and authenticate) to get auth token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "StrongPassword123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: "Admin User",
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create shopping mall channel as admin
  const channelCode = `channel_${RandomGenerator.alphaNumeric(8)}`;
  const channelName = `Channel ${RandomGenerator.name(2)}`;

  // We make parent_channel_id explicitly null indicating top-level channel
  const createChannelBody = {
    parent_channel_id: null,
    channel_code: channelCode,
    channel_name: channelName,
    description: null,
  } satisfies IShoppingMallChannelDefinition.ICreate;

  const channel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: createChannelBody,
    });
  typia.assert(channel);

  // 3. Validate response data
  TestValidator.predicate(
    "Response has valid UUID id",
    typia.is<string & tags.Format<"uuid">>(channel.id),
  );
  TestValidator.equals(
    "Channel code matches",
    channel.channel_code,
    channelCode,
  );
  TestValidator.equals(
    "Channel name matches",
    channel.channel_name,
    channelName,
  );
  TestValidator.equals(
    "Parent channel id is null",
    channel.parent_channel_id,
    null,
  );
  TestValidator.predicate(
    "Created at is valid ISO date",
    typeof channel.created_at === "string" && channel.created_at.length > 0,
  );
  TestValidator.predicate(
    "Updated at is valid ISO date",
    typeof channel.updated_at === "string" && channel.updated_at.length > 0,
  );
  TestValidator.equals("Description is null", channel.description, null);
  TestValidator.predicate(
    "Deleted at is null or undefined",
    channel.deleted_at === null || channel.deleted_at === undefined,
  );

  // 4. Check admin role is respected (implicitly verified by success)
  // No unauthorized access errors should be thrown, or TestValidator.error can be added for negative testing
}
