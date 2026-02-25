import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
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

export async function test_api_customer_notifications_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate the customer by joining the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
    },
  });
  // Set token header for subsequent requests
  customerConnection.headers = {
    Authorization: authorizedCustomer.token.access,
  };
  // Prepare test cases for pagination and filtering
  // 1. General request with page=1, limit=10, sorted by created_at descending
  const paginationRequest1: IShoppingMallUserNotification.IRequest = {
    page: 1,
    limit: 10,
    sortBy: "created_at",
    sortOrder: "desc",
    ownerType: "customer",
  };
  // Execute request for page 1
  const page1 = await api.functional.shoppingMall.customer.notifications.index(
    customerConnection,
    { body: paginationRequest1 },
  );
  typia.assert(page1);
  // Check pagination metadata validity
  TestValidator.predicate(
    "current page must be 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit must be within range",
    page1.pagination.limit > 0 && page1.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    page1.pagination.pages >= 0,
  );
  // Each notification must have correct properties and valid timestamps
  for (const notification of page1.data) {
    typia.assert(notification);
    TestValidator.equals(
      "owner type should be customer",
      notification.ownerType,
      "customer",
    );
    TestValidator.predicate(
      "id format valid",
      /^[0-9a-fA-F-]{36}$/.test(notification.id),
    );
    TestValidator.predicate(
      "title is non-empty",
      notification.title.length > 0,
    );
    TestValidator.predicate("body is non-empty", notification.body.length > 0);
    // isRead boolean
    TestValidator.predicate(
      "isRead is boolean",
      typeof notification.isRead === "boolean",
    );
    // deliveredAt may be null or ISO string
    if (notification.deliveredAt !== null) {
      TestValidator.predicate(
        "deliveredAt valid ISO string",
        !isNaN(Date.parse(notification.deliveredAt)),
      );
    }
    // readAt may be null or ISO string
    if (notification.readAt !== null) {
      TestValidator.predicate(
        "readAt valid ISO string",
        !isNaN(Date.parse(notification.readAt)),
      );
    }
    // timestamps createdAt, updatedAt (non-null ISO)
    TestValidator.predicate(
      "createdAt valid ISO string",
      !isNaN(Date.parse(notification.createdAt)),
    );
    TestValidator.predicate(
      "updatedAt valid ISO string",
      !isNaN(Date.parse(notification.updatedAt)),
    );
    // deletedAt nullable ISO string
    if (notification.deletedAt !== null) {
      TestValidator.predicate(
        "deletedAt valid ISO string",
        !isNaN(Date.parse(notification.deletedAt)),
      );
    }
    // url and imageUrl nullable strings
    TestValidator.predicate(
      "url nullable or string",
      notification.url === null || typeof notification.url === "string",
    );
    TestValidator.predicate(
      "imageUrl nullable or string",
      notification.imageUrl === null ||
        typeof notification.imageUrl === "string",
    );
  }
  // 2. Filter notifications: isRead = true
  const readFilterRequest: IShoppingMallUserNotification.IRequest = {
    ownerType: "customer",
    isRead: true,
    sortBy: "created_at",
    sortOrder: "desc",
    page: 1,
    limit: 5,
  };
  const readNotifications =
    await api.functional.shoppingMall.customer.notifications.index(
      customerConnection,
      { body: readFilterRequest },
    );
  typia.assert(readNotifications);
  TestValidator.predicate(
    "all notifications are marked as read",
    readNotifications.data.every((n) => n.isRead === true),
  );
  // 3. Filter notifications: isRead = false
  const unreadFilterRequest: IShoppingMallUserNotification.IRequest = {
    ownerType: "customer",
    isRead: false,
    sortBy: "created_at",
    sortOrder: "desc",
    page: 1,
    limit: 5,
  };
  const unreadNotifications =
    await api.functional.shoppingMall.customer.notifications.index(
      customerConnection,
      { body: unreadFilterRequest },
    );
  typia.assert(unreadNotifications);
  TestValidator.predicate(
    "all notifications are marked as unread",
    unreadNotifications.data.every((n) => n.isRead === false),
  );
}
