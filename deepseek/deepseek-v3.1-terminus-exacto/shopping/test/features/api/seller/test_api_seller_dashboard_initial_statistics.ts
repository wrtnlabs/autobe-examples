import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Test that a newly registered seller with no products, orders, or pending requests receives correct zero-count statistics.
 *
 * Note: The dashboard endpoint returns IEcommerceSeller type which contains seller profile information,
 * but the provided schema does not include statistical fields like products, order_items, etc.
 * This test validates that the seller profile is properly returned for a newly registered seller.
 */
export async function test_api_seller_dashboard_initial_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Register a new seller account using utility function
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Call the dashboard endpoint using seller-specific connection
  const dashboardStats =
    await api.functional.ecommerce.seller.dashboard(sellerConnection);
  typia.assert(dashboardStats);
  // Validate the returned seller profile matches the registered seller
  TestValidator.equals(
    "seller ID should match",
    dashboardStats.id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "email should match",
    dashboardStats.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "shop name should match",
    dashboardStats.shop_name,
    sellerAuth.shop_name,
  );
  TestValidator.predicate(
    "seller profile should be properly populated",
    !!dashboardStats.account_status && !!dashboardStats.created_at,
  );
}
