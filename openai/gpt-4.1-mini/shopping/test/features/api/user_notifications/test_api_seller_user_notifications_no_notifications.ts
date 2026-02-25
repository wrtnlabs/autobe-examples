import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotification";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_user_notifications_no_notifications(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that the GET /shoppingMall/seller/userNotifications endpoint
  // returns an empty data set with correct pagination metadata when there are no
  // matching notifications for the authenticated seller with the given filters.
  // Step 1: Seller registration and authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerStrongPass123",
      shopName: "testShopNoNotifications",
    },
  });
  // Recreate authorized seller connection with token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // Step 2: Compose request body filters that deliberately yield no notifications
  // Using distinct ownerType and future time ranges to avoid hits
  const requestBody: IShoppingMallUserNotification.IRequest = {
    ownerType: "seller-no-match",
    isRead: true,
    deliveredFrom: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // future
    deliveredTo: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // future
    page: 1,
    limit: 10,
    sortBy: "deliveredAt",
    sortOrder: "desc",
  };
  // Step 3: Call the user notifications index endpoint as seller
  const response =
    await api.functional.shoppingMall.seller.userNotifications.index(
      sellerConnection,
      { body: requestBody },
    );
  // Step 4: Validate response structure
  typia.assert(response);
  // Step 5: Validate that no notifications are returned
  TestValidator.equals("notification list is empty", response.data.length, 0);
  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages count", response.pagination.pages, 0);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  // Step 7: Validate seller-only authorization enforcement
  // Test with no authorization header
  await TestValidator.httpError(
    "unauthorized when missing authorization header",
    401,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.index(
        connection,
        {
          body: requestBody,
        },
      );
    },
  );
  // Test with invalid authorization header
  const invalidConnection: api.IConnection = { host: connection.host };
  invalidConnection.headers = { Authorization: "Bearer invalid.token.here" };
  await TestValidator.httpError(
    "unauthorized when invalid authorization token",
    401,
    async () => {
      await api.functional.shoppingMall.seller.userNotifications.index(
        invalidConnection,
        {
          body: requestBody,
        },
      );
    },
  );
}
