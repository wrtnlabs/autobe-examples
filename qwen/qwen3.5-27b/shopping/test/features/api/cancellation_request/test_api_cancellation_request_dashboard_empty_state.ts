import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the cancellation request dashboard when a seller has no cancellation requests.
 *
 * 1. Register and authenticate as a seller
 * 2. Access the cancellation request dashboard
 * 3. Verify all summary counts are zero
 * 4. Verify recent requests array is empty
 */
export async function test_api_cancellation_request_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Access the cancellation request dashboard
  const dashboard =
    await api.functional.shoppingMall.customer.cancellation_requests.dashboard(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 3. Verify summary statistics are all zero
  TestValidator.equals("pendingCount is 0", dashboard.summary.pendingCount, 0);
  TestValidator.equals(
    "approvedCount is 0",
    dashboard.summary.approvedCount,
    0,
  );
  TestValidator.equals(
    "rejectedCount is 0",
    dashboard.summary.rejectedCount,
    0,
  );
  TestValidator.equals("totalCount is 0", dashboard.summary.totalCount, 0);
  // 4. Verify recent requests array is empty
  TestValidator.equals(
    "recentRequests array is empty",
    dashboard.recentRequests.length,
    0,
  );
}
