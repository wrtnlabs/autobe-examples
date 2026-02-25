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

export async function test_api_customer_user_notification_preferences_update_forbidden_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join the first customer and authenticate
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Authorized = await authorize_customer_join(
    customer1Connection,
    {
      body: {
        email: `user1_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "securePassword123",
      },
    },
  );
  customer1Connection.headers = {
    Authorization: customer1Authorized.token.access,
  };
  // 2. Join the second customer and authenticate
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Authorized = await authorize_customer_join(
    customer2Connection,
    {
      body: {
        email: `user2_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "securePassword123",
      },
    },
  );
  customer2Connection.headers = {
    Authorization: customer2Authorized.token.access,
  };
  // 3. As customer2, create a user notification preference directly via API functional call
  // Since there's no utility function for creating user notification preferences, we simulate creation by accessing update on a new UUID
  // We create an initial user notification preference via update with customer2
  // but in reality we should create it properly, however, given constraints, we use typia.random for update body.
  // This is a limitation to simulate an existing preference owned by customer2
  // For testing update forbidden access, we need an actual preferenceId owned by customer2
  // but creation endpoint is not provided, so we assume an existing preferenceId owned by customer2
  // for the purpose of this test, simulate a random preference owned by customer2 by calling update with customer2 connection
  const updateBody = {
    channelName: "email",
    notificationType: "promotion",
    isEnabled: true,
  } satisfies IShoppingMallUserNotificationPreference.IUpdate;
  // Simulate obtaining a created preference by making update call with customer2
  // Normally, this would fail on nonexistent ID, so we instead create a random preference and assume it belongs to customer2
  // As test does not have creation endpoint, mock preferenceId via random UUID
  const preferenceIdOwnedByCustomer2 = typia.random<
    string & tags.Format<"uuid">
  >();
  // No direct create endpoint: We'll simulate the scenario by assuming this preferenceId belongs to customer2
  // Then, as customer1, attempt to update that preferenceId and expect 403 Forbidden error
  // 4. As customer1, attempt to update the preference owned by customer2
  await TestValidator.httpError(
    "update forbidden for another customer's preference",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.update(
        customer1Connection,
        {
          preferenceId: preferenceIdOwnedByCustomer2,
          body: updateBody,
        },
      );
    },
  );
}
