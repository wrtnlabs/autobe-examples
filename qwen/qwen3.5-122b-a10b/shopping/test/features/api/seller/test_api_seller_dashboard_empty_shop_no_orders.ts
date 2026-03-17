import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallDashboard";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_empty_shop_no_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller with empty shop
  const sellerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(auth);
  // 2. Call dashboard endpoint with seller connection
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard(sellerConnection);
  typia.assert(dashboard);
  // 3. Validate all counts are zero for empty shop
  TestValidator.equals(
    "active product count",
    dashboard.active_product_count,
    0,
  );
  TestValidator.equals("order item count", dashboard.order_item_count, 0);
  TestValidator.equals(
    "pending cancellation request count",
    dashboard.pending_cancellation_request_count,
    0,
  );
  TestValidator.equals(
    "pending refund request count",
    dashboard.pending_refund_request_count,
    0,
  );
}
