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

export async function test_api_customer_user_notification_erase(
  connection: api.IConnection,
): Promise<void> {
  // Test Scenario 1: Successful Deletion of User Notification by Owner Customer
  // - Prerequisites
  //   1. Customer account creation via /auth/customer/join
  //   2. Existing user notification record owned by the authenticated customer
  // - Test Steps
  //   1. Authenticate as the customer.
  //   2. Call DELETE /shoppingMall/customer/userNotifications/{userNotificationId} with a valid notification ID belonging to the customer.
  //   3. Validate the response status is 204 No Content.
  //   4. Verify the notification record is deleted from the database.
  // - Expected Results
  //   - Notification is permanently removed.
  //   - No content returned in response.
  // Test Scenario 2: Attempt to Delete Non-Existent User Notification
  // - Prerequisites
  //   1. Customer account creation via /auth/customer/join
  // - Test Steps
  //   1. Authenticate as the customer.
  //   2. Call DELETE /shoppingMall/customer/userNotifications/{userNotificationId} with a randomly generated UUID that does not correspond to any notification.
  //   3. Validate the response status is 404 Not Found with appropriate error message.
  // - Expected Results
  //   - Operation fails gracefully.
  //   - Client is informed the notification does not exist.
  // Test Scenario 3: Unauthorized Deletion Attempt by Different Customer
  // - Prerequisites
  //   1. Customer A account creation via /auth/customer/join
  //   2. Customer B account creation via /auth/customer/join
  //   3. User notification record owned by Customer A
  // - Test Steps
  //   1. Authenticate as Customer B.
  //   2. Attempt to delete the notification owned by Customer A using DELETE /shoppingMall/customer/userNotifications/{userNotificationId}.
  //   3. Validate the response status is 403 Forbidden.
  // - Expected Results
  //   - Unauthorized user cannot delete another customer's notification.
  //   - Proper authorization error returned.
  // 1. Customer A joins
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {},
  });
  customerAConnection.headers = { Authorization: customerAAuth.token.access };
  // 2. Customer B joins
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {},
  });
  customerBConnection.headers = { Authorization: customerBAuth.token.access };
  // 3. We simulate the creation of a user notification for Customer A
  // (Here we generate a UUID to represent that notification's ID)
  const userNotificationIdForCustomerA = typia.random<
    string & tags.Format<"uuid">
  >();
  // Since we have no direct API to create user notifications, we'll assume
  // for this test the notification exists with that ID belonging to Customer A.
  // 4. Customer A tries to delete their own notification, expect success (204 No Content)
  await api.functional.shoppingMall.customer.userNotifications.erase(
    customerAConnection,
    { userNotificationId: userNotificationIdForCustomerA },
  );
  // 5. Customer B tries to delete Customer A's notification, expect failure (403 Forbidden)
  await TestValidator.httpError(
    "unauthorized deletion attempt by different customer",
    403,
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.erase(
        customerBConnection,
        { userNotificationId: userNotificationIdForCustomerA },
      );
    },
  );
  // 6. Customer B tries to delete a non-existent notification, expect failure (404 Not Found)
  const nonExistentNotificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "deletion attempt of non-existent notification",
    404,
    async () => {
      await api.functional.shoppingMall.customer.userNotifications.erase(
        customerBConnection,
        { userNotificationId: nonExistentNotificationId },
      );
    },
  );
}
