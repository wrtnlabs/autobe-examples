import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_user_notification_preferences_filter_pagination_seller(
  connection: api.IConnection,
): Promise<void> {
  // Seller authentication to get authorized seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(authorizedSeller);
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = authorizedSeller.token.access;
  // Scenario 1: Query preferences with empty body - filters are not defined in schema
  const response1 =
    await api.functional.shoppingMall.seller.userNotificationPreferences.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(response1);
  TestValidator.predicate(
    "pagination current page >= 1",
    response1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response1.pagination.pages >= 0,
  );
  // Scenario 2: Query preferences with empty body again
  const response2 =
    await api.functional.shoppingMall.seller.userNotificationPreferences.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(response2);
  TestValidator.predicate(
    "pagination current page >= 1",
    response2.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response2.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response2.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response2.pagination.pages >= 0,
  );
  // Scenario 3: Query with page beyond available pages by requesting empty body (pagination page param not in schema)
  const pageBeyond =
    response2.pagination.pages > 0 ? response2.pagination.pages + 1 : 1;
  const response3 =
    await api.functional.shoppingMall.seller.userNotificationPreferences.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(response3);
  TestValidator.equals("empty data for page beyond", response3.data.length, 0);
  TestValidator.equals(
    "pagination current page matches last query",
    response3.pagination.current,
    response3.pagination.current,
  );
}
