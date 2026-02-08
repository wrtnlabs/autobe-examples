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

export async function test_api_seller_notifications_summary_empty(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a seller using authorize_seller_join
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Update the sellerConnection headers with the authorized access token
  sellerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // Step 2: Call the notification summary API for the authenticated seller
  const notifications =
    await api.functional.shoppingMall.seller.notifications.summary.index(
      sellerConnection,
    );
  // Step 3: Validate the response structure
  typia.assert(notifications);
  // Step 4: Assert that the data array is empty
  TestValidator.equals(
    "notifications data array should be empty",
    notifications.data,
    [],
  );
  // Step 5: Assert that pagination metadata shows zero records, zero pages
  TestValidator.equals(
    "pagination records should be zero",
    notifications.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    notifications.pagination.pages,
    0,
  );
  // Step 6: Pagination current should be 1 as per schema spec (1-indexed current page number)
  TestValidator.equals(
    "pagination current should be 1",
    notifications.pagination.current,
    1,
  );
  // Step 7: Pagination limit should be non-negative
  TestValidator.predicate(
    "pagination limit should be non-negative",
    notifications.pagination.limit >= 0,
  );
}
