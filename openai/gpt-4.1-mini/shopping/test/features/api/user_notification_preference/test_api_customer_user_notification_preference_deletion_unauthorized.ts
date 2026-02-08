import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_preference_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test that attempting to delete a user notification preference without owning it results in 403 Forbidden error
  // Create first customer account (owner of the notification preference)
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customer1Auth);
  customer1Connection.headers = { Authorization: customer1Auth.token.access };
  // Create second customer account (attempts to delete other's preference)
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: typia.random<IShoppingMallCustomer.IJoin>(),
  });
  typia.assert(customer2Auth);
  customer2Connection.headers = { Authorization: customer2Auth.token.access };
  // We assume first customer has a userNotificationPreferenceId they own
  // Since there is no API given to create or list preferences, use a random UUID to simulate an existing preference owned by another user
  const fakePreferenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt deletion by second customer; expect 403 Forbidden
  await TestValidator.httpError(
    "customer cannot delete notification preference of another user",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotificationPreferences.erase(
        customer2Connection,
        { userNotificationPreferenceId: fakePreferenceId },
      );
    },
  );
}
