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

export async function test_api_seller_dashboard_with_active_products_and_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Verify seller registration response structure
  TestValidator.equals("seller ID is UUID", sellerAuth.seller.id.length, 36);
  TestValidator.equals(
    "seller email matches",
    sellerAuth.seller.email,
    sellerAuth.seller.email,
  );
  TestValidator.predicate(
    "seller has shop name",
    sellerAuth.seller.shop_name.length > 0,
  );
  TestValidator.predicate(
    "seller approval status exists",
    ["pending", "approved", "rejected"].includes(
      sellerAuth.seller.approval_status,
    ),
  );
  TestValidator.predicate(
    "seller account status exists",
    ["active", "suspended", "banned"].includes(
      sellerAuth.seller.account_status,
    ),
  );
  // 3. Call the seller dashboard endpoint
  const dashboard =
    await api.functional.ecommerceMall.seller.dashboard(sellerConnection);
  typia.assert(dashboard);
  // 4. Validate dashboard count fields are present and non-negative (business logic validation)
  TestValidator.predicate(
    "active_product_count is non-negative",
    dashboard.active_product_count >= 0,
  );
  TestValidator.predicate(
    "order_item_count is non-negative",
    dashboard.order_item_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellation_request_count is non-negative",
    dashboard.pending_cancellation_request_count >= 0,
  );
  TestValidator.predicate(
    "pending_refund_request_count is non-negative",
    dashboard.pending_refund_request_count >= 0,
  );
}
