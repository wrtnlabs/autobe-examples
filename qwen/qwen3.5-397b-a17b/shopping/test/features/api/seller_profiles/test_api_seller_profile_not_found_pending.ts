import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
 * Test that retrieving a seller profile returns 404 when the seller is registered but not yet approved.
 *
 * Validates the business rule that seller profiles are only created upon admin approval, not at registration time. This ensures customers cannot view unapproved seller storefronts, maintaining platform quality control.
 *
 * 1. Register a new seller account with email and credentials via seller join endpoint.
 * 2. The seller account is created with approval_status 'pending' by default.
 * 3. Attempt to retrieve the seller's profile using the public seller profile endpoint.
 * 4. Validate that the response returns 404 Not Found because no profile exists for pending sellers.
 * 5. This confirms the business logic that profiles are only created upon admin approval.
 */
export async function test_api_seller_profile_not_found_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (approval_status will be 'pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Verify seller was created with pending status
  TestValidator.equals(
    "seller approval status",
    seller.approval_status,
    "pending",
  );
  // 3. Attempt to retrieve seller profile (should fail with 404)
  await TestValidator.httpError(
    "pending seller profile not found",
    404,
    async () => {
      await api.functional.shoppingMall.seller_profiles.at(sellerConnection, {
        sellerId: seller.id,
      });
    },
  );
}
