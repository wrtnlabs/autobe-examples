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

export async function test_api_seller_notifications_summary_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Seller join (no body needed as IShoppingMallSeller.IJoin is empty)
  const joinConnection: IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(joinConnection, { body: {} });
  // Create seller connection with Authorization header
  const sellerConnection: IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorized.token.access}` },
  };
  // Call notifications summary endpoint
  const output =
    await api.functional.shoppingMall.seller.notifications.summary.index(
      sellerConnection,
    );
  typia.assert(output);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination current >= 0",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    output.pagination.pages >= 0,
  );
  // Validate each notification summary
  for (const notification of output.data) {
    typia.assert(notification);
  }
}
