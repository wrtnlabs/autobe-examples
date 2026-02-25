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

export async function test_api_customer_user_notification_preferences_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create an initial user notification preference owned by the customer (simulate creation via random generation because no create API is given)
  // As we do not have an API for creation, simulate a preference owned by this customer
  const originalPreference: IShoppingMallUserNotificationPreference = {
    id: typia.random<string & tags.Format<"uuid">>(),
    customerId: authorized.id,
    sellerId: null,
    administratorId: null,
    channelName: "email",
    notificationType: "order_update",
    isEnabled: true,
    createdAt: new Date().toISOString() as string & tags.Format<"date-time">,
    updatedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    deletedAt: null,
  };
  // 3. Prepare updated data for notification preference
  const updateBody: IShoppingMallUserNotificationPreference.IUpdate = {
    channelName: "sms",
    notificationType: "promotion",
    isEnabled: false,
  };
  // 4. Execute update using the utility function
  const updatedPreference =
    await api.functional.shoppingMall.customer.userNotificationPreferences.update(
      customerConnection,
      {
        preferenceId: originalPreference.id,
        body: updateBody,
      },
    );
  // 5. Validate the updated preference response
  typia.assert(updatedPreference);
  TestValidator.equals(
    "id remains unchanged",
    updatedPreference.id,
    originalPreference.id,
  );
  TestValidator.equals(
    "customerId remains unchanged",
    updatedPreference.customerId,
    authorized.id,
  );
  TestValidator.equals(
    "channelName updated",
    updatedPreference.channelName,
    updateBody.channelName,
  );
  TestValidator.equals(
    "notificationType updated",
    updatedPreference.notificationType,
    updateBody.notificationType,
  );
  TestValidator.equals(
    "isEnabled updated",
    updatedPreference.isEnabled,
    updateBody.isEnabled,
  );
  // 6. Check attempted unauthorized updates (simulate update with forbidden fields changed) - this part is not part of current test due to lack of API support and is out of scope for success test
}
