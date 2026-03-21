import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
 * Test successful token refresh with a valid refresh token.
 *
 * 1. Register a new customer account using the join endpoint to obtain initial
 *    access and refresh tokens for testing refresh operation.
 * 2. Call the refresh endpoint with the valid refresh token.
 * 3. Verify that the response contains a new access token, a new refresh token
 *    (token rotation), updated session timestamps, and customer profile information.
 * 4. Validate that the new access token has a future expiration timestamp and
 *    the refresh token can be used for subsequent refresh operations.
 *
 * This validates the primary success path for maintaining authenticated sessions
 * without re-login.
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer to obtain initial tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(initialAuth);
  // Store the initial refresh token for testing
  const initialRefreshToken = initialAuth.token.refresh;
  const initialAccessToken = initialAuth.token.access;
  // Step 2: Use the refresh token to obtain new tokens
  const refreshedAuth =
    await api.functional.ecommerceMall.auth.customer.refresh(
      customerConnection,
      {
        body: {
          refresh: initialRefreshToken,
        } satisfies IEcommerceMallCustomer.IRefresh,
      },
    );
  typia.assert(refreshedAuth);
  // Step 3: Validate new access token exists and is different (token rotation)
  TestValidator.notEquals(
    "new access token",
    refreshedAuth.token.access,
    initialAccessToken,
  );
  TestValidator.predicate(
    "new access token exists",
    refreshedAuth.token.access.length > 0,
  );
  // Step 4: Validate new refresh token exists (token rotation)
  TestValidator.notEquals(
    "new refresh token",
    refreshedAuth.token.refresh,
    initialRefreshToken,
  );
  TestValidator.predicate(
    "new refresh token exists",
    refreshedAuth.token.refresh.length > 0,
  );
  // Step 5: Validate session timestamps are updated
  TestValidator.predicate(
    "access token has future expiration",
    new Date(refreshedAuth.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token has future expiration",
    new Date(refreshedAuth.token.refreshable_until) > new Date(),
  );
  // Step 6: Validate customer profile information is present
  TestValidator.equals("customer id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals(
    "customer email matches",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.predicate("profile exists", !!refreshedAuth.profile);
  TestValidator.equals("profile id exists", !!refreshedAuth.profile.id, true);
  // Step 7: Validate the new refresh token can be used for subsequent refresh
  const secondRefreshAuth =
    await api.functional.ecommerceMall.auth.customer.refresh(
      customerConnection,
      {
        body: {
          refresh: refreshedAuth.token.refresh,
        } satisfies IEcommerceMallCustomer.IRefresh,
      },
    );
  typia.assert(secondRefreshAuth);
  // Verify the second refresh also works (chain of refresh operations)
  TestValidator.predicate(
    "second refresh returns valid token",
    secondRefreshAuth.token.access.length > 0,
  );
  TestValidator.notEquals(
    "second access token different",
    secondRefreshAuth.token.access,
    refreshedAuth.token.access,
  );
}
