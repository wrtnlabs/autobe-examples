import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallSellerStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerStatistic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_initial_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register seller account (starts in pending approval status)
  const joinResponse = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // Verify approval status is 'pending' initially
  TestValidator.equals(
    "seller approval status is pending initially",
    joinResponse.data.profile.approval_status,
    "pending",
  );
  // Make dashboard statistics request
  const dashboardStats =
    await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
  typia.assert(dashboardStats);
  // Verify initial statistics are zero or default values
  TestValidator.equals(
    "total_products initially zero",
    dashboardStats.total_products,
    0,
  );
  TestValidator.equals(
    "total_order_items initially zero",
    dashboardStats.total_order_items,
    0,
  );
  TestValidator.equals(
    "pending_cancellation_requests zero",
    dashboardStats.pending_cancellation_requests,
    0,
  );
  TestValidator.equals(
    "pending_refund_requests zero",
    dashboardStats.pending_refund_requests,
    0,
  );
  TestValidator.equals("total_reviews zero", dashboardStats.total_reviews, 0);
  TestValidator.equals(
    "total_sales_revenue zero",
    dashboardStats.total_sales_revenue,
    0,
  );
  TestValidator.equals(
    "pending_seller_approvals zero",
    dashboardStats.pending_seller_approvals,
    0,
  );
  TestValidator.equals(
    "pending_shipments zero",
    dashboardStats.pending_shipments,
    0,
  );
  TestValidator.equals(
    "average_rating null initially",
    dashboardStats.average_rating,
    null,
  );
  TestValidator.predicate(
    "last_calculated_at exists",
    dashboardStats.last_calculated_at !== undefined,
  );
}
