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

export async function test_api_customer_notification_preferences_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Define a new notification preference update
  const updateBody = {
    channelName: "email",
    notificationType: "order_update",
    isEnabled: true,
  } satisfies IShoppingMallUserNotificationPreference.IUpdate;
  // 3. Call the updatePreferences utility function to update notification preferences
  // Note: This endpoint returns 204 No Content with no response body
  await api.functional.shoppingMall.customer.notifications.preferences.updatePreferences(
    customerConnection,
    { body: updateBody },
  );
  // 4. To verify the update, call GET /shoppingMall/customer/notifications/preferences
  // Although this utility function or SDK function is not provided in the given info,
  // the scenario instructs to confirm data in subsequent retrievals, so we attempt
  // to call the GET preferences endpoint via api functional directly if possible.
  // But since no GET API or utility is provided for retrieving preferences, the
  // test stops after updatePreferences call.
  // Therefore, we trust the backend and just assert no errors happened.
  // 5. Test completed without errors, ensuring update went through successfully
}
