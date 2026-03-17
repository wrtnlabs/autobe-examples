import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ISellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerDashboard";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_with_pending_cancellation_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account using utility function
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with authentication token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  // 3. Retrieve seller dashboard metrics
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboard);
  // 4. Validate dashboard metrics are non-negative integers
  TestValidator.predicate(
    "productCount is non-negative integer",
    dashboard.productCount >= 0,
  );
  TestValidator.predicate(
    "orderItemCount is non-negative integer",
    dashboard.orderItemCount >= 0,
  );
  TestValidator.predicate(
    "pendingCancellationCount is non-negative integer",
    dashboard.pendingCancellationCount >= 0,
  );
  TestValidator.predicate(
    "pendingRefundCount is non-negative integer",
    dashboard.pendingRefundCount >= 0,
  );
}
