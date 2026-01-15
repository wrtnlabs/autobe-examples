import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBroadcastNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBroadcastNotification";
import { prepare_random_shopping_mall_broadcast_notification } from "../../../prepare/prepare_random_shopping_mall_broadcast_notification";
import { generate_random_shopping_mall_admin_notifications_broadcast_create } from "../../../generate/generate_random_shopping_mall_admin_notifications_broadcast_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_broadcast_notification_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Broadcast notification with valid content (under 500 characters)
  const notificationContent = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 3,
    wordMax: 10,
  }); // Guaranteed to be under 500 characters by design
  const broadcast =
    await api.functional.shoppingMall.admin.notifications.broadcast.create(
      adminConnection,
      {
        body: {
          content: notificationContent,
        } satisfies IShoppingMallBroadcastNotification.ICreate,
      },
    );
  typia.assert(broadcast);
  // Validate broadcast response contains the correct content
  TestValidator.equals(
    "notification content matches",
    broadcast.content,
    notificationContent,
  );
}
