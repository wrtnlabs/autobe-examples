import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAnalytic";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
 * Test that pending approval sellers are blocked from accessing analytics endpoint.
 *
 * Validates that sellers with pending approval status cannot access platform-wide analytics data. This test ensures proper access control enforcement by attempting to retrieve analytics as an unapproved seller and verifying the request is rejected with a 403 Forbidden error.
 *
 * The test follows these steps:
 * 1. Register a new seller account with randomized credentials
 * 2. The seller account is created with pending approval status by default
 * 3. Authenticate as the pending seller using the join response token
 * 4. Attempt to access the analytics endpoint
 * 5. Verify the request fails with 403 Forbidden status code
 *
 * This confirms that the platform correctly restricts analytics access to only approved sellers and administrators.
 */
export async function test_api_seller_analytics_pending_approval_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (will have pending approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Verify the seller has pending approval status
  TestValidator.equals(
    "approval status is pending",
    sellerAuth.approval_status,
    "pending",
  );
  // 2. Attempt to access analytics endpoint as pending seller
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "pending seller cannot access analytics",
    403,
    async () => {
      await api.functional.ecommerce.seller.analytics.at(sellerConnection);
    },
  );
}
