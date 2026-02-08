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

export async function test_api_customer_user_notification_preference_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that updating a user notification preference by a customer who does not own it fails.
  // Create a new customer and authorize them
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin = {};
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = authorized.token.access;
  // Prepare an update payload for the notification preference
  const updateBody =
    typia.random<IShoppingMallUserNotificationPreference.IUpdate>();
  // Use a random UUID as the userNotificationPreferenceId which is assumed to belong to another user
  const foreignPreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update the foreign user's notification preference
  // This should be rejected by the system with an authorization error
  await TestValidator.httpError(
    "updating user notification preference by unauthorized user should fail",
    403,
    async () =>
      await api.functional.shoppingMall.customer.userNotificationPreferences.update(
        customerConnection,
        {
          userNotificationPreferenceId: foreignPreferenceId,
          body: updateBody,
        },
      ),
  );
}
