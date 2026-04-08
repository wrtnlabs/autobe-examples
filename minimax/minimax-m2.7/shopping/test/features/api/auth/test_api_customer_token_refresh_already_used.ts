import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that refresh tokens cannot be reused after rotation (replay attack prevention).
 *
 * Validates the token rotation security feature by ensuring that once a refresh token
 * is used to obtain new tokens, the original refresh token becomes invalid. This prevents
 * replay attacks where stolen refresh tokens could be used to gain unauthorized access.
 *
 * The test flow:
 * 1. Registers a new customer account to obtain initial JWT tokens including refresh token
 * 2. Captures the original refresh token from the registration response
 * 3. Calls the refresh endpoint once to perform token rotation - this succeeds and issues new tokens
 * 4. Attempts to use the original refresh token again (which is now invalidated due to rotation)
 * 5. Expects the system to reject the second attempt with an authentication error
 *
 * This test is critical for security as it validates the replay attack prevention mechanism
 * for the authentication system.
 */
export async function test_api_customer_token_refresh_already_used(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Capture the original refresh token for later reuse attempt
  const originalRefreshToken = authorized.token.refresh;
  // 2. Perform token rotation by refreshing with the original token
  // This should succeed and issue new tokens
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(refreshedConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IEcommerceMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  // Verify the refresh was successful (tokens should be different)
  TestValidator.notEquals(
    "new access token should differ from original",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ from original",
    authorized.token.refresh,
    refreshed.token.refresh,
  );
  // 3. Attempt to reuse the original refresh token (should fail)
  // The original refresh token should now be invalid due to rotation
  await TestValidator.error("reuse refresh token should fail", async () => {
    const failConnection: api.IConnection = { host: connection.host };
    await authorize_customer_refresh(failConnection, {
      body: {
        refresh: originalRefreshToken,
      } satisfies IEcommerceMallCustomer.IRefresh,
    });
  });
}
