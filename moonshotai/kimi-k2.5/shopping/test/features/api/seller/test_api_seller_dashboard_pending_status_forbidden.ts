import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
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
 * Test that sellers with pending or rejected approval status receive 403 Forbidden when attempting to access the dashboard.
 * This scenario validates the access control logic that restricts dashboard functionality to only approved sellers.
 * Per business requirements, sellers in pending status (awaiting administrator review) or rejected status (failed approval) cannot list products, create variants, or access seller features including the dashboard.
 * The test verifies that the endpoint properly checks seller.approval_status and returns 403 Forbidden with an appropriate error message when the status is not 'approved'.
 */
export async function test_api_seller_dashboard_pending_status_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller-specific connection with isolated headers
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller account - this creates a seller with pending approval status by default
  // According to API specification: "newly registered seller will initially have a pending approval status"
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // Verify the seller has pending status (as expected for new registrations)
  TestValidator.equals(
    "seller has pending approval status",
    seller.approvalStatus,
    "pending",
  );
  // Attempt to access the seller dashboard with pending status
  // This should result in 403 Forbidden as only approved sellers can access the dashboard
  await TestValidator.httpError(
    "pending seller cannot access dashboard",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.dashboard.at(sellerConnection);
    },
  );
}
