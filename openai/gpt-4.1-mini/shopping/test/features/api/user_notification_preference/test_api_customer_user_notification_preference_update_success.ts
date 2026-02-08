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

export async function test_api_customer_user_notification_preference_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer join and authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(authorized);
  // Update connection headers with authenticated token
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // 2. Create a new user notification preference for testing update
  // Since no creation endpoint available, we simulate by getting a random existing UUID and creating update body
  // Note: Because IShoppingMallUserNotificationPreference has no detailed fields described,
  // we have no info about properties, so we must simulate the update request body
  // We will create UUID for userNotificationPreferenceId and a random update body
  // Generate a random UUID for userNotificationPreferenceId
  const userNotificationPreferenceId = typia.random<
    string & tags.Format<"uuid">
  >();
  // Compose update body
  // IShoppingMallUserNotificationPreference.IUpdate is empty object type, so pass empty object
  // But the scenario says to update channel, notification type, and enabled status, thus
  // we must construct a realistic update request body according to those concepts.
  // However, DTO says IUpdate is `{}`, no property info. So we cannot send any meaningful data.
  // To proceed, we just send empty body since no property is defined.
  // This matches the strict requirement of schema compliance.
  const body = {} satisfies IShoppingMallUserNotificationPreference.IUpdate;
  // 3. Call update API endpoint
  const output =
    await api.functional.shoppingMall.customer.userNotificationPreferences.update(
      customerConnection,
      {
        userNotificationPreferenceId,
        body,
      },
    );
  typia.assert(output);
  // 4. Validate response - Since output type has no properties per provided types, just assert pass
  // We cannot check fields that don't exist, so just test that typia.assert didn't throw
}
