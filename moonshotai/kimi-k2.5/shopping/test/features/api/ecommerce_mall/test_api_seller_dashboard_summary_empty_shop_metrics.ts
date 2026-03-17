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
 * Empty shop edge case - A newly approved seller with no products and no order history retrieves dashboard summary.
 * Test verifies: (1) After seller authentication via POST /ecommerceMall/auth/seller/join, calling GET /ecommerceMall/seller/dashboard/summary returns HTTP 200 with all four metrics set to 0, (2) totalProducts = 0 indicates an empty product catalog, (3) totalOrderItems = 0 indicates no orders have been placed for this seller's products, (4) pendingCancellationRequests = 0 indicates no pending cancellation requests require attention, (5) pendingRefundRequests = 0 indicates no pending refund requests require attention. This scenario validates proper handling of edge cases where the seller has no data yet.
 */
export async function test_api_seller_dashboard_summary_empty_shop_metrics(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller (no products, no orders)
  await authorize_seller_join(sellerConnection, {
    body: {},
  });
  // Get dashboard summary for empty shop
  const summary: IEcommerceMallSeller.IDashboardSummary =
    await api.functional.ecommerceMall.seller.dashboard.summary(
      sellerConnection,
    );
  typia.assert(summary);
  // Validate all metrics are 0 for empty shop
  TestValidator.equals(
    "totalProducts should be 0 for empty shop",
    summary.totalProducts,
    0,
  );
  TestValidator.equals(
    "totalOrderItems should be 0 for empty shop",
    summary.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "pendingCancellationRequests should be 0 for empty shop",
    summary.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests should be 0 for empty shop",
    summary.pendingRefundRequests,
    0,
  );
}
