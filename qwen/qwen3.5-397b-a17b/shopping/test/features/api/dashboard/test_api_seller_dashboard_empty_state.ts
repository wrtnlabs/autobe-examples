import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test seller dashboard endpoint for newly registered member with empty business state.
 *
 * Validates the seller dashboard returns correct zero counts when a member has no business activity. The test registers a new member account, authenticates them, and verifies the dashboard endpoint returns all required fields with zero values.
 *
 * This test ensures the dashboard endpoint properly handles the empty state scenario where a seller has not yet created products, received orders, or had any cancellation/refund requests. All four count fields must be present and equal to zero.
 *
 * 1. Register new member account with unique email credentials.
 * 2. Create authenticated connection using token from join response.
 * 3. Call GET /shoppingMall/member/dashboard endpoint.
 * 4. Validate response structure using typia.assert.
 * 5. Verify all four count fields equal zero.
 */
export async function test_api_seller_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const memberAuth = await authorize_member_join(connection, {});
  typia.assert(memberAuth);
  // 2. Create authenticated connection for dashboard access
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Call dashboard endpoint
  const dashboard =
    await api.functional.shoppingMall.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 4. Verify all counts are zero for empty state
  TestValidator.equals("product_count is zero", dashboard.product_count, 0);
  TestValidator.equals(
    "order_item_count is zero",
    dashboard.order_item_count,
    0,
  );
  TestValidator.equals(
    "pending_cancellation_count is zero",
    dashboard.pending_cancellation_count,
    0,
  );
  TestValidator.equals(
    "pending_refund_count is zero",
    dashboard.pending_refund_count,
    0,
  );
}
