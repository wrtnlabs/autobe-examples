import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_notification_preferences_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to update notification preferences without authentication.
  // Prepare a random valid notification preferences update payload
  const body = typia.random<IShoppingMallUserNotificationPreference.IUpdate>();
  // Attempt the update using base connection without setting Authorization header
  await TestValidator.httpError(
    "unauthorized update of notification preferences returns 403",
    403,
    async () => {
      await api.functional.shoppingMall.customer.notifications.preferences.updatePreferences(
        connection,
        { body },
      );
    },
  );
}
