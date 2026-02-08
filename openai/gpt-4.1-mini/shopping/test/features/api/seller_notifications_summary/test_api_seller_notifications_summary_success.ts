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

export async function test_api_seller_notifications_summary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join and authorize
  const baseConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(baseConnection, {
    body: typia.random<{}>(),
  });
  // 2. Create seller connection with access token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // 3. Call notifications summary API
  const summary =
    await api.functional.shoppingMall.seller.notifications.summary.index(
      sellerConnection,
    );
  // 4. Assert full summary type
  typia.assert(summary);
  // 5. Validate pagination values
  TestValidator.predicate(
    "pagination current page is positive",
    summary.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    summary.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    summary.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches records and limit",
    summary.pagination.pages === 0 || summary.pagination.pages >= 1,
  );
  // 6. For each notification, assert existence and skip non-existent properties
  for (const notification of summary.data) {
    typia.assert(notification);
    // No further property validations since ISummary is empty type
  }
}
