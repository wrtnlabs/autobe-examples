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

export async function test_api_customer_notifications_preferences_bulk_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate customer and get authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare bulk update payload for preferences
  const updateBody = [
    {
      channelName: "email",
      notificationType: "order_updates",
      enabled: true,
    },
    {
      channelName: "sms",
      notificationType: "promotions",
      enabled: false,
    },
    {
      channelName: "push",
      notificationType: "shipping_updates",
      enabled: true,
    },
  ] satisfies Array<{
    channelName: string;
    notificationType: string;
    enabled: boolean;
  }>;
  // Call updatePreferences utility function
  const updatedPreferences =
    await api.functional.shoppingMall.customer.notifications.preferences.updatePreferences(
      customerConnection,
      {
        body: updateBody as any, // cast as any due to incomplete DTO
      },
    );
  // Assert response at runtime
  typia.assert(updatedPreferences);
  // Confirm response is array for iteration
  if (!Array.isArray(updatedPreferences)) {
    throw new Error("updatedPreferences response is not an array");
  }
  // Validate updated preferences
  for (const expectedPref of updateBody) {
    const match = updatedPreferences.find(
      (p) =>
        p.channelName === expectedPref.channelName &&
        p.notificationType === expectedPref.notificationType,
    );
    TestValidator.predicate(
      `preference for channel=${expectedPref.channelName} and type=${expectedPref.notificationType} exists`,
      match !== undefined,
    );
    if (match) {
      TestValidator.equals(
        `enabled for channel=${expectedPref.channelName} and type=${expectedPref.notificationType}`,
        match.enabled,
        expectedPref.enabled,
      );
    }
  }
}
