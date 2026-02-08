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

export async function test_api_seller_user_notifications_list_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuth);
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Call userNotifications PATCH /shoppingMall/seller/userNotifications with empty body for default pagination
  const body: IShoppingMallUserNotification.IRequest = {};
  const output =
    await api.functional.shoppingMall.seller.userNotifications.index(
      sellerConnection,
      { body },
    );
  // 3. Validate response
  typia.assert(output);
  // Pagination metadata validations
  TestValidator.predicate(
    "pagination current page not negative",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit not negative",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records not negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages not negative",
    output.pagination.pages >= 0,
  );
  // Validate data: each item should be of type IShoppingMallUserNotification.ISummary
  output.data.forEach((item, index) => {
    typia.assert(item);
  });
}
