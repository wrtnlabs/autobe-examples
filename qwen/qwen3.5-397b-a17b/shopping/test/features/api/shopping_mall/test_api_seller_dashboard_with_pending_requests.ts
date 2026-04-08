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
 * Test seller dashboard endpoint to verify aggregated statistics response structure.
 *
 * Validates the seller dashboard endpoint returns properly structured data containing product count, order item count, and pending request counts. Since product/order/cancellation/refund creation APIs are not available in the current SDK, this test focuses on response structure validation and type safety rather than specific count matching against created data.
 *
 * The dashboard provides sellers with a quick overview of their shop performance including total products listed, total order items purchased, and pending customer requests requiring attention (cancellations and refunds).
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Calls GET /shoppingMall/member/dashboard as authenticated member.
 * 3. Validates response structure through typia.assert() for complete type validation.
 * 4. Verifies all counts are non-negative integers meeting business logic constraints.
 */
export async function test_api_seller_dashboard_with_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Call dashboard endpoint
  const dashboard =
    await api.functional.shoppingMall.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
  // 3. Validate business logic - all counts are non-negative
  TestValidator.predicate(
    "product_count is non-negative",
    () => dashboard.product_count >= 0,
  );
  TestValidator.predicate(
    "order_item_count is non-negative",
    () => dashboard.order_item_count >= 0,
  );
  TestValidator.predicate(
    "pending_cancellation_count is non-negative",
    () => dashboard.pending_cancellation_count >= 0,
  );
  TestValidator.predicate(
    "pending_refund_count is non-negative",
    () => dashboard.pending_refund_count >= 0,
  );
}
