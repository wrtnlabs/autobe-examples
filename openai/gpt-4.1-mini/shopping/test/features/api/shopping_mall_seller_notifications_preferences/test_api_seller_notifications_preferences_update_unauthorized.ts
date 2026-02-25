import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_notifications_preferences_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that updating notification preferences without any authentication is rejected with a 403 Forbidden error.
  // No authorization header is set on the connection deliberately.
  const body = {
    channelName: "email",
    notificationType: "order_update",
    isEnabled: true,
  } satisfies IShoppingMallUserNotificationPreference.IUpdate;
  // Use base connection without authorization
  await TestValidator.httpError(
    "should reject unauthorized update attempt with 403",
    403,
    async () => {
      await api.functional.shoppingMall.seller.notifications.preferences.updatePreferences(
        connection,
        { body },
      );
    },
  );
}
