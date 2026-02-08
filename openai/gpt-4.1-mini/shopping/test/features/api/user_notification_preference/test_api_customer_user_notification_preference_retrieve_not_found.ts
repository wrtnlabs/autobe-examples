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

export async function test_api_customer_user_notification_preference_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a user notification preference with an ID that does not exist in the system.
  // 1. Authenticate as a valid customer
  // 2. Attempt to retrieve a user notification preference by a random UUID not present in database
  // 3. Verify the response status is 404 Not Found
  // 1. Authenticate customer and create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create random UUID not present in system
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve the user notification preference with fake ID
  await TestValidator.httpError(
    "user notification preference not found",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.at(
        customerConnection,
        {
          userNotificationPreferenceId: fakeId,
        },
      );
    },
  );
}
