import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a pending seller is denied access to the seller dashboard.
 *
 * Verifies that a newly registered seller whose administrator approval is
 * still pending receives a 403 Forbidden response when attempting to
 * access the seller dashboard. This ensures the dashboard endpoint enforces
 * the business rule that only approved sellers may view their shop activity.
 *
 * 1. Register a new seller via authorize_seller_join, which automatically
 *    authenticates the seller and sets their approval status to "pending".
 * 2. Confirm the seller's approval_status is "pending".
 * 3. Attempt to access the seller dashboard and verify a 403 HttpError is thrown.
 */
export async function test_api_seller_dashboard_pending_approval_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller — starts in "pending" approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  typia.assert(seller);
  // 2. Confirm the seller is pending approval
  TestValidator.equals(
    "seller is pending approval",
    seller.approval_status,
    "pending",
  );
  // 3. Pending seller should be denied dashboard access with 403
  await TestValidator.httpError(
    "pending seller denied dashboard access",
    403,
    async () => {
      await api.functional.shoppingMall.seller.dashboard.at(sellerConnection);
    },
  );
}
