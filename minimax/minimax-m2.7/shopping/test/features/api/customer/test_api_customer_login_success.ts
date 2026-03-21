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

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Test customer login with valid credentials.
  // 1. Register a new customer account with email 'test_customer_login@example.com' and password 'SecurePass123!'
  // 2. Attempt to log in using the same email and password
  // 3. Validate response contains JWT tokens, customer ID matches, email correct, profile info present with display_name and phone, empty arrays for orders/reviews/wishlist/cart, and token expired_at is in the future
  // 1. Register new customer with specific credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: "test_customer_login@example.com",
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registeredCustomer);
  // 2. Log in with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(loginConnection, {
    body: {
      email: "test_customer_login@example.com",
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loggedInCustomer);
  // 3. Validate response contains JWT access and refresh tokens
  TestValidator.predicate(
    "response contains access token",
    loggedInCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "response contains refresh token",
    loggedInCustomer.token.refresh.length > 0,
  );
  // Validate customer ID matches the registered account
  TestValidator.equals(
    "customer ID matches registered account",
    loggedInCustomer.id,
    registeredCustomer.id,
  );
  // Validate email is returned correctly
  TestValidator.equals(
    "email matches",
    loggedInCustomer.email,
    "test_customer_login@example.com",
  );
  // Validate profile information is included with display_name and phone
  TestValidator.predicate(
    "profile has display_name",
    loggedInCustomer.profile.display_name !== null &&
      loggedInCustomer.profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "profile has phone",
    loggedInCustomer.profile.phone.length >= 10,
  );
  // Validate empty arrays for orders/reviews (new account)
  TestValidator.equals(
    "orders array is empty",
    loggedInCustomer.orders.length,
    0,
  );
  TestValidator.equals(
    "reviews array is empty",
    loggedInCustomer.reviews.length,
    0,
  );
  // Validate empty wishlist for new account (wishlist is IEcommerceMallWishlistItem | null)
  TestValidator.equals(
    "wishlist is empty",
    loggedInCustomer.wishlist === null,
    true,
  );
  // Validate cart is empty for new account (cart is IEcommerceMallCartItem | null)
  TestValidator.equals("cart is empty", loggedInCustomer.cart === null, true);
  // Validate token expired_at timestamp is in the future
  const now = new Date();
  const expiredAt = new Date(loggedInCustomer.token.expired_at);
  TestValidator.predicate(
    "token expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
}