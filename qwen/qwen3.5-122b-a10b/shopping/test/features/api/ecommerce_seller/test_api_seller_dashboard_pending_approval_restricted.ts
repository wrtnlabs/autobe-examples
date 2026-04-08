import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceShopDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShopDashboard";
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
 * Test seller dashboard access restriction for pending approval status.
 *
 * Validates that sellers with pending approval status cannot access the shop dashboard endpoint and receive a 403 Forbidden response. This ensures the authorization system properly restricts unapproved sellers from accessing selling features before administrator approval is granted.
 *
 * The test verifies the business rule that pending and rejected sellers are blocked from dashboard access, maintaining platform quality control during the seller approval workflow.
 *
 * 1. Register a new seller account with pending approval status.
 * 2. Create seller-specific connection with authentication token.
 * 3. Attempt to access the seller dashboard endpoint.
 * 4. Validate 403 Forbidden response is returned.
 * 5. Verify error indicates authorization restriction.
 */
export async function test_api_seller_dashboard_pending_approval_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Verify seller has pending approval status
  TestValidator.equals(
    "seller approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Attempt to access dashboard - should fail with 403 Forbidden
  await TestValidator.httpError(
    "pending seller cannot access dashboard",
    403,
    async () => {
      await api.functional.ecommerce.seller.dashboard.at(sellerConnection);
    },
  );
}
