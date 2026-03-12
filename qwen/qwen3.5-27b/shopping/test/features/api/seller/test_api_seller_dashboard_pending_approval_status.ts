import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDashboard";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that a seller with pending approval status cannot access the seller dashboard.
 *
 * This test validates the business rule that sellers must be approved by an
 * administrator before they can access seller-specific features like the
 * dashboard. A newly registered seller has approval_status='pending' and
 * should be denied access to the dashboard endpoint.
 */
export async function test_api_seller_dashboard_pending_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (approval_status will be 'pending' by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Verify the seller has pending approval status
  TestValidator.equals(
    "approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 2. Attempt to access the dashboard with the pending seller's connection
  // The sellerConnection already has the authorization token set by authorize_seller_join
  await TestValidator.httpError(
    "pending seller cannot access dashboard",
    403,
    async () =>
      await api.functional.shoppingMall.seller.dashboard.at(sellerConnection),
  );
}
