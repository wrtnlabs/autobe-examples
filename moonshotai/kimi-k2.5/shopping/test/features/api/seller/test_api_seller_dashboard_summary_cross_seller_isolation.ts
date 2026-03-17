import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Data isolation and cross-seller access restrictions - A seller exists alongside other sellers,
 * and the dashboard summary strictly filters data to only show metrics belonging to the authenticated seller.
 *
 * Test verifies:
 * 1. Authenticate as Seller A via seller registration
 * 2. Get Seller A dashboard summary (initial state)
 * 3. Create Seller B as a separate seller account
 * 4. Get Seller A dashboard summary again
 * 5. Verify the metrics did not change - Seller A's product count and order count remained the same,
 *    validating that sellers can only view their own shop performance data, not other sellers' data.
 */
export async function test_api_seller_dashboard_summary_cross_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 2: Get Seller A's initial dashboard summary
  const summaryA1 =
    await api.functional.ecommerceMall.seller.dashboard.summary(
      sellerAConnection,
    );
  typia.assert(summaryA1);
  // Step 3: Create Seller B (different seller account)
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 4: Get Seller A's dashboard summary again (Seller A should still see only their own data)
  const summaryA2 =
    await api.functional.ecommerceMall.seller.dashboard.summary(
      sellerAConnection,
    );
  typia.assert(summaryA2);
  // Step 5: Verify data isolation - Seller A's metrics must be unchanged
  TestValidator.equals(
    "totalProducts unchanged after Seller B creation",
    summaryA2.totalProducts,
    summaryA1.totalProducts,
  );
  TestValidator.equals(
    "totalOrderItems unchanged after Seller B creation",
    summaryA2.totalOrderItems,
    summaryA1.totalOrderItems,
  );
  TestValidator.equals(
    "pendingCancellationRequests unchanged after Seller B creation",
    summaryA2.pendingCancellationRequests,
    summaryA1.pendingCancellationRequests,
  );
  TestValidator.equals(
    "pendingRefundRequests unchanged after Seller B creation",
    summaryA2.pendingRefundRequests,
    summaryA1.pendingRefundRequests,
  );
}
