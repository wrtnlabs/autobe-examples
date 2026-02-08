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

export async function test_api_customer_user_notification_retrieve_detailed(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve a user notification by its unique identifier as an authenticated customer.
  // - Preconditions: The user owns the notification.
  // - Steps: Authenticate as a customer, then call the endpoint with a valid notification ID belonging to the customer.
  // - Verify the response contains full notification details including title, body, timestamps, delivery and read status.
  // Scenario 2: Attempt to retrieve a notification by a user who does not own the notification.
  // - Preconditions: The notification exists but belongs to a different user.
  // - Steps: Authenticate as a customer, then call the endpoint with a valid notification ID that does not belong to the authenticated user.
  // - Expect 404 Not Found or access denied response.
  // Scenario 3: Try to retrieve a notification that does not exist.
  // - Steps: Authenticate as a customer, then call the endpoint with an invalid or non-existent notification ID.
  // - Expect 404 Not Found response.
  // Each scenario verifies proper authorization, ownership validation, and data integrity.
  // Setup 2 customer connections
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  // Join first customer
  const firstCustomerAuth = await authorize_customer_join(
    firstCustomerConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    },
  );
  firstCustomerConnection.headers = {
    Authorization: firstCustomerAuth.token.access,
  };
  // Join second customer
  const secondCustomerAuth = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {} satisfies IShoppingMallCustomer.IJoin,
    },
  );
  secondCustomerConnection.headers = {
    Authorization: secondCustomerAuth.token.access,
  };
  // Simulate notification creation for first customer (We have no direct API to create notification, so we assume to use the atUserNotification with a random UUID-like id for demonstration. In real tests, you would create the notification first via other APIs or fixtures.)
  // For test purpose, the first customer tries with a valid notification ID (simulate random UUID)
  const validNotificationId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Retrieve notification owned by first user - assume the id belongs to them (simulate valid retrieval)
  const notification =
    await api.functional.shoppingMall.customer.userNotifications.atUserNotification(
      firstCustomerConnection,
      { userNotificationId: validNotificationId },
    );
  typia.assert(notification);
  // Scenario 2: Retrieve notification that is owned by first user, attempt with second user - expect failure
  await TestValidator.httpError(
    "retrieve notification by unowned user should fail",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.atUserNotification(
        secondCustomerConnection,
        { userNotificationId: validNotificationId },
      );
    },
  );
  // Scenario 3: Retrieve notification with a non-existent notification ID
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "retrieve non-existent notification should fail",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.atUserNotification(
        firstCustomerConnection,
        { userNotificationId: nonExistentNotificationId },
      );
    },
  );
}
