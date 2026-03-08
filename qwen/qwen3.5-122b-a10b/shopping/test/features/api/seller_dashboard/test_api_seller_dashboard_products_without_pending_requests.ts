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

export async function test_api_seller_dashboard_products_without_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Call the dashboard endpoint
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard(sellerConnection);
  typia.assert(dashboard);
  // 3. Validate dashboard response structure
  TestValidator.equals(
    "dashboard has active_product_count",
    dashboard.active_product_count,
    dashboard.active_product_count,
  );
  TestValidator.equals(
    "dashboard has order_item_count",
    dashboard.order_item_count,
    dashboard.order_item_count,
  );
  TestValidator.equals(
    "dashboard has pending_cancellation_request_count",
    dashboard.pending_cancellation_request_count,
    dashboard.pending_cancellation_request_count,
  );
  TestValidator.equals(
    "dashboard has pending_refund_request_count",
    dashboard.pending_refund_request_count,
    dashboard.pending_refund_request_count,
  );
}
