import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAnalytic";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_analytics_empty_platform_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Call analytics endpoint with seller authentication
  const analytics =
    await api.functional.ecommerce.seller.analytics.at(sellerConnection);
  typia.assert(analytics);
  // 3. Verify empty platform data - products
  TestValidator.equals("products count", analytics.products, 0);
  // 4. Verify empty platform data - customers
  TestValidator.equals("customers count", analytics.customers, 0);
  // 5. Verify empty platform data - orders
  TestValidator.equals("orders total", analytics.orders.total, 0);
  TestValidator.equals("orders paid count", analytics.orders.by_status.paid, 0);
  TestValidator.equals(
    "orders shipped count",
    analytics.orders.by_status.shipped,
    0,
  );
  TestValidator.equals(
    "orders delivered count",
    analytics.orders.by_status.delivered,
    0,
  );
  TestValidator.equals(
    "orders cancelled count",
    analytics.orders.by_status.cancelled,
    0,
  );
  TestValidator.equals(
    "orders refunded count",
    analytics.orders.by_status.refunded,
    0,
  );
  TestValidator.equals(
    "orders partially_completed count",
    analytics.orders.by_status.partially_completed,
    0,
  );
  // 6. Verify seller statistics (should include the test seller)
  TestValidator.predicate(
    "sellers total is at least 1",
    analytics.sellers.total >= 1,
  );
  TestValidator.predicate(
    "at least one approved seller",
    analytics.sellers.by_approval_status.approved >= 1,
  );
  // 7. Verify empty pending requests
  TestValidator.equals(
    "pending cancellation requests",
    analytics.pending_cancellation_requests,
    0,
  );
  TestValidator.equals(
    "pending refund requests",
    analytics.pending_refund_requests,
    0,
  );
  // 8. Verify generated_at timestamp is present and valid
  TestValidator.predicate(
    "generated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(analytics.generated_at),
  );
}
