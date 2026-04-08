import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboard";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the seller dashboard cancellation-refund endpoint to verify it returns correct pending cancellation and refund counts for an authenticated seller.
 *
 * The test validates the dashboard statistics endpoint that sellers use to monitor their order management workload. Since the full order/cancellation workflow requires additional API endpoints not available in the current SDK, this test focuses on validating the endpoint response structure and ensuring it returns valid data for an authenticated seller.
 *
 * 1. Seller registers account via join operation (approval_status starts as 'pending').
 * 2. Seller authenticates via login operation using same credentials from registration.
 * 3. Seller requests the dashboard cancellation-refund statistics endpoint.
 * 4. Validates response structure conforms to IShoppingMallDashboard.ICancellationRefund DTO.
 *
 * Note: In a complete test environment with all API endpoints available, the test would also create seller products, customer orders, and cancellation requests to verify accurate counting. This test validates the endpoint is accessible to authenticated sellers and returns properly structured data conforming to IShoppingMallDashboard.ICancellationRefund DTO.
 */
export async function test_api_seller_dashboard_cancellation_refund_pending_cancellations(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  // 1. Register seller account
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 2. Create seller-specific connection and login with same credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 3. Request dashboard cancellation-refund statistics
  const dashboard =
    await api.functional.shoppingMall.seller.dashboard.cancellation_refund.at(
      sellerConnection,
    );
  typia.assert(dashboard);
}
