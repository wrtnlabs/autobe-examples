import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

export async function test_api_shopping_mall_channel_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins the system to register and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        name: RandomGenerator.name(),
        password: "validStrongPassword123!",
        phone_number: null,
        role: "admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "admin token is present",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );
  TestValidator.equals("admin email matches input", admin.email, adminEmail);
  TestValidator.equals("admin role is admin", admin.role, "admin");

  // 2. Admin creates a new shopping mall channel
  const channelCode = `channel_${RandomGenerator.alphaNumeric(6)}`;
  const channelName = RandomGenerator.name();
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.shoppingMallChannels.create(
      connection,
      {
        body: {
          code: channelCode,
          name: channelName,
        } satisfies IShoppingMallChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Validation of created channel information
  TestValidator.predicate(
    "channel id is non empty",
    typeof channel.id === "string" && channel.id.length > 0,
  );
  TestValidator.equals("channel code matches input", channel.code, channelCode);
  TestValidator.equals("channel name matches input", channel.name, channelName);
  TestValidator.predicate(
    "channel created_at is valid date",
    !isNaN(Date.parse(channel.created_at)),
  );
}
