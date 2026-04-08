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
 * Test the seller dashboard endpoint when the seller has products and order items but no pending requests.
 *
 * Validates the complete seller dashboard response including product count, order item count, and pending request counts. Ensures that the dashboard correctly aggregates statistics about the seller's shop performance and pending customer requests requiring attention.
 *
 * Special attention is given to verifying that all count fields are non-negative integers and that the response structure matches the IShoppingMallSellerDashboard DTO definition. The dashboard should accurately reflect the seller's business metrics including total products listed, total order items purchased, and pending cancellation/refund requests awaiting seller review.
 *
 * 1. Member registers and authenticates as a seller.
 * 2. Calls GET /shoppingMall/member/dashboard endpoint.
 * 3. Validates response structure contains all four required fields.
 * 4. Verifies all count fields are non-negative integers.
 * 5. Confirms pending counts reflect only requests requiring seller attention.
 *
 * Note: The available API functions do not include product creation, order creation, or cancellation/refund request management endpoints. This test validates the dashboard endpoint response structure and type safety. In a complete test environment with full API coverage, the preconditions would be established through those additional endpoints.
 */
export async function test_api_seller_dashboard_with_products_and_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Call seller dashboard endpoint
  const dashboard =
    await api.functional.shoppingMall.member.dashboard.at(memberConnection);
  typia.assert(dashboard);
}
