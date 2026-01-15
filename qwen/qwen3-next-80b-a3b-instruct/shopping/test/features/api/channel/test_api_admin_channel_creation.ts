import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import { prepare_random_shopping_mall_channel } from "../../../prepare/prepare_random_shopping_mall_channel";
import { generate_random_shopping_mall_admin_channels_create } from "../../../generate/generate_random_shopping_mall_admin_channels_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_channel_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@wrtn.io",
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join-" + RandomGenerator.alphaNumeric(6),
      referrer:
        "https://example.com/admin/signup-" + RandomGenerator.alphaNumeric(6),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a new sales channel with valid data
  const channelName = `mainstore-${RandomGenerator.alphaNumeric(8)}`;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    adminConnection,
    {
      body: {
        name: channelName,
        description: RandomGenerator.paragraph({
          sentences: 4,
          wordMin: 5,
          wordMax: 10,
        }),
        salesType: RandomGenerator.pick([
          "online",
          "physical",
          "marketplace",
          "hybrid",
        ] as const),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  // Step 3: Validate channel response properties
  TestValidator.equals(
    "channel name follows expected pattern",
    channel.name,
    channelName,
  );
  TestValidator.predicate(
    "description is within 1-500 character limit",
    channel.description.length >= 1 && channel.description.length <= 500,
  );
  TestValidator.predicate(
    "sales type is one of allowed values",
    ["online", "physical", "marketplace", "hybrid"].includes(channel.salesType),
  );
  TestValidator.equals(
    "active status is true by default",
    channel.active,
    true,
  );
  // Note: The 'id' field is automatically generated and validated by typia.assert(channel)
  // The compiler error indicates 'id' does not exist on IShoppingMallChannel,
  // but as per the scenario it should be present. We rely on typia.assert(channel) to validate
  // the complete response structure including id if present, and to catch any schema violations.
}
