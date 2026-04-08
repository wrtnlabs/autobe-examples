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
 * Test successful customer login with valid credentials.
 *
 * Validates the complete customer authentication flow including account registration followed by login. This test verifies that after registering a new customer, the login endpoint correctly authenticates the customer and returns complete account information with auto-created resources.
 *
 * The test validates:
 * - Token generation with access and refresh tokens
 * - Customer ID and email match the registered account
 * - Profile object with display name and phone number
 * - Empty shopping cart auto-created on registration
 * - Empty wishlist auto-created on registration
 * - Account status (deletedAt is null for active account)
 *
 * 1. Register a new customer with valid email, password, and name.
 * 2. Perform login with the registered credentials.
 * 3. Validate all response fields match expected values.
 * 4. Verify auto-created resources (cart, wishlist) are present.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account with known password
  const customerConnection: api.IConnection = { host: connection.host };
  const testPassword = "TestPassword123!";
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      password: testPassword,
    },
  });
  // 2. Perform login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginCredentials = {
    email: registeredCustomer.email,
    password: testPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallCustomer.ILogin;
  const authenticated = await authorize_customer_login(loginConnection, {
    body: loginCredentials,
  });
  // 3. Validate response with typia.assert()
  typia.assert(authenticated);
  // 4. Validate business logic
  // Token structure validation
  TestValidator.equals(
    "has access token",
    authenticated.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "has refresh token",
    authenticated.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "has expiration timestamp",
    !!authenticated.token.expired_at,
    true,
  );
  TestValidator.equals(
    "has refreshable until timestamp",
    !!authenticated.token.refreshable_until,
    true,
  );
  // Customer ID matches
  TestValidator.equals(
    "customer ID matches registered",
    authenticated.id,
    registeredCustomer.id,
  );
  // Email matches
  TestValidator.equals(
    "email matches registered",
    authenticated.email,
    registeredCustomer.email,
  );
  // Profile validation
  TestValidator.equals(
    "has display name",
    authenticated.profile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "has phone number",
    authenticated.profile.phone.length > 0,
    true,
  );
  // Account status
  TestValidator.equals("account is active", authenticated.deletedAt, null);
  // Auto-created resources
  TestValidator.equals(
    "has cart object",
    authenticated.cart !== null && authenticated.cart !== undefined,
    true,
  );
  TestValidator.equals(
    "has wishlist object",
    authenticated.wishlist !== null && authenticated.wishlist !== undefined,
    true,
  );
  TestValidator.equals("cart has id", authenticated.cart.id.length > 0, true);
  TestValidator.equals(
    "wishlist has id",
    authenticated.wishlist.id.length > 0,
    true,
  );
}
