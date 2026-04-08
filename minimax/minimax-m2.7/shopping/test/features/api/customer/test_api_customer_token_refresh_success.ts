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
 * Test successful token refresh with token rotation for customer authentication.
 *
 * Validates the complete token refresh flow including registration to obtain initial tokens,
 * extracting the refresh token, calling the refresh endpoint, and verifying that token rotation
 * is properly implemented. Ensures that valid refresh tokens are accepted and new tokens are
 * issued while maintaining the customer session.
 *
 * 1. Register a new customer to obtain initial access and refresh tokens.
 * 2. Extract the refresh token from the authorization response.
 * 3. Call the refresh endpoint with the valid refresh token.
 * 4. Verify new access and refresh tokens are returned (token rotation).
 * 5. Verify the response contains customer ID and profile matching original.
 */
export async function test_api_customer_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to obtain initial access and refresh tokens
  const authorized = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) + "!Aa1",
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Extract the refresh token from the authorization response
  const originalRefreshToken = authorized.token.refresh;
  const originalAccessToken = authorized.token.access;
  // 3. Create a new connection for refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  // 4. Call the refresh endpoint with the valid refresh token
  const refreshed = await authorize_customer_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    },
  });
  typia.assert(refreshed);
  // 5. Verify new tokens are issued (different from original for token rotation)
  TestValidator.notEquals(
    "new access token is different",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token is different",
    refreshed.token.refresh,
    originalRefreshToken,
  );
  // 6. Verify the response contains customer ID matching original
  TestValidator.equals("customer ID matches", refreshed.id, authorized.id);
  TestValidator.equals(
    "customer email matches",
    refreshed.email,
    authorized.email,
  );
  // 7. Verify customer profile is present in response
  TestValidator.predicate("has customer profile", !!refreshed.profile);
  TestValidator.equals(
    "profile display name matches",
    refreshed.profile.display_name,
    authorized.profile.display_name,
  );
}
