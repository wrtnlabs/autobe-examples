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

export async function test_api_customer_notifications_preferences_bulk_update_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as customer via join
  const customerConnection: api.IConnection = { host: connection.host };
  // Empty join body because IShoppingMallCustomer.IJoin is empty
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Attach the token to the customer connection
  customerConnection.headers = {
    ...(customerConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Send empty preferences list to clear existing preferences
  const emptyPreferences: IShoppingMallUserNotificationPreference.IUpdateMany =
    [];
  // Call updatePreferences utility function
  const response =
    await api.functional.shoppingMall.customer.notifications.preferences.updatePreferences(
      customerConnection,
      { body: emptyPreferences },
    );
  // Assert the response type correctness
  typia.assert(response);
  // Validate that response is an empty array (all preferences cleared)
  TestValidator.equals("response is empty preferences list", response, []);
}
