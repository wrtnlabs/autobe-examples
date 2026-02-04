import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSellerDashboard";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
export async function test_api_seller_dashboard_metrics_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // sellerConnection.headers is now updated internally by authorize function
  // Step 2: Attempt to access the admin-only metrics endpoint using seller connection
  // This should fail with 403 Forbidden as sellers are not authorized to access admin metrics
  await TestValidator.httpError(
    "seller should be denied access to admin dashboard metrics",
    403,
    () => {
      return api.functional.shoppingMall.seller.dashboard.sellers.metrics.index(
        sellerConnection,
      );
    },
  );
}
