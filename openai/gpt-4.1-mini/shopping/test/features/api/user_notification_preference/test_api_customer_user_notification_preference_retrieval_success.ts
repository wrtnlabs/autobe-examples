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
import { generate_random_shopping_mall_customer_user_notification_preferences_create } from "../../../generate/generate_random_shopping_mall_customer_user_notification_preferences_create";
import { prepare_random_shopping_mall_user_notification_preference } from "../../../prepare/prepare_random_shopping_mall_user_notification_preference";

export async function test_api_customer_user_notification_preference_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(
    customerJoinConnection,
    {},
  );
  typia.assert(authorizedCustomer);
  // Update connection with authorization tokens
  customerJoinConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // 2. Create a new notification preference for this customer
  const createdPreference =
    await generate_random_shopping_mall_customer_user_notification_preferences_create(
      customerJoinConnection,
      {
        body: {
          customerId: authorizedCustomer.id,
          channelName: "email",
          notificationType: "order_update",
          isEnabled: true,
        },
      },
    );
  typia.assert(createdPreference);
  // 3. Retrieve the notification preference by ID
  const retrievedPreference =
    await api.functional.shoppingMall.customer.userNotificationPreferences.at(
      customerJoinConnection,
      { preferenceId: createdPreference.id },
    );
  typia.assert(retrievedPreference);
  // 4. Verify fields match
  TestValidator.equals(
    "preference id",
    retrievedPreference.id,
    createdPreference.id,
  );
  TestValidator.equals(
    "customerId",
    retrievedPreference.customerId ?? null,
    authorizedCustomer.id,
  );
  TestValidator.equals(
    "channelName",
    retrievedPreference.channelName,
    createdPreference.channelName,
  );
  TestValidator.equals(
    "notificationType",
    retrievedPreference.notificationType,
    createdPreference.notificationType,
  );
  TestValidator.equals(
    "isEnabled",
    retrievedPreference.isEnabled,
    createdPreference.isEnabled,
  );
  // 5. Edge case: non-existent preferenceId
  await TestValidator.httpError(
    "not found for non-existent preferenceId",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.at(
        customerJoinConnection,
        { preferenceId: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // 6. Edge case: unauthorized access to other customer's preference
  const anotherCustomerConnection: api.IConnection = { host: connection.host };
  const anotherAuthorizedCustomer = await authorize_customer_join(
    anotherCustomerConnection,
    {},
  );
  typia.assert(anotherAuthorizedCustomer);
  anotherCustomerConnection.headers = {
    Authorization: anotherAuthorizedCustomer.token.access,
  };
  await TestValidator.httpError(
    "unauthorized access for other customer's preference",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.at(
        anotherCustomerConnection,
        { preferenceId: createdPreference.id },
      );
    },
  );
}
