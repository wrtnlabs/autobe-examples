import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_user_notification_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Register and authorize a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody: IShoppingMallCustomer.IJoin =
    typia.random<IShoppingMallCustomer.IJoin>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: joinBody,
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // Step 2. Prepare a user notification owned by the customer
  // Since no API to create notifications directly is described, assume a notification can be fetched from the system or pre-exists for update test.
  // We'll simulate by creating a random notification from typia and imagine its id.
  // For a real test in production, you would create or fetch a notification owned by the user.
  const ownedNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Prepare update payload for Scenario 1
  const nowISOString = new Date().toISOString();
  const updateBody1: IShoppingMallUserNotification.IUpdate = {
    title: RandomGenerator.name(),
    body: RandomGenerator.paragraph({ sentences: 3 }),
    url: RandomGenerator.alphaNumeric(10),
    imageUrl: RandomGenerator.alphaNumeric(10),
    isRead: true,
    deliveredAt: nowISOString,
    readAt: nowISOString,
  };
  // Scenario 1: Successful update by owner
  const updatedNotification1 =
    await api.functional.shoppingMall.customer.userNotifications.updateUserNotification(
      customerConnection,
      {
        userNotificationId: ownedNotificationId,
        body: updateBody1,
      },
    );
  typia.assert(updatedNotification1);
  // Scenario 2: Attempt unauthorized update with a different userNotificationId
  const fakeNotificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.updateUserNotification(
        customerConnection,
        {
          userNotificationId: fakeNotificationId,
          body: updateBody1,
        },
      );
    },
  );
  // Scenario 3: Partial update with null URL and imageUrl
  const updateBody3: IShoppingMallUserNotification.IUpdate = {
    title: RandomGenerator.name(),
    body: RandomGenerator.paragraph({ sentences: 2 }),
    url: null,
    imageUrl: null,
    isRead: false,
    deliveredAt: nowISOString,
    readAt: nowISOString,
  };
  const updatedNotification3 =
    await api.functional.shoppingMall.customer.userNotifications.updateUserNotification(
      customerConnection,
      {
        userNotificationId: ownedNotificationId,
        body: updateBody3,
      },
    );
  typia.assert(updatedNotification3);
}
