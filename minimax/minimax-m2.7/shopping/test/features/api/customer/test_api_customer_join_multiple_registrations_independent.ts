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
 * Test multiple successful customer registrations with different valid credentials.
 *
 * Validates the complete customer registration flow by registering two independent
 * customers with unique email addresses and valid passwords. Verifies that each
 * registration succeeds independently and that the system correctly creates unique
 * resources (JWT tokens, customer IDs, wishlists, and shopping carts) for each
 * customer. Ensures that registrations are isolated and do not interfere with
 * each other's data.
 *
 * 1. First customer registers with unique email and valid password.
 * 2. Second customer registers with different unique email and valid password.
 * 3. Validates first customer has unique ID, valid JWT token, auto-generated wishlist and cart.
 * 4. Validates second customer has unique ID, valid JWT token, auto-generated wishlist and cart.
 * 5. Verifies customer IDs are different (proving independence).
 * 6. Verifies wishlists have different IDs (auto-created for each customer).
 * 7. Verifies shopping carts have different IDs (auto-created for each customer).
 * 8. Validates token structure contains access, refresh, expired_at, refreshable_until fields.
 */
export async function test_api_customer_join_multiple_registrations_independent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer1);
  // 2. Register second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer2);
  // 3. Validate first customer has required fields
  TestValidator.equals("customer1 has valid id", !!customer1.id, true);
  TestValidator.equals("customer1 has valid email", !!customer1.email, true);
  TestValidator.equals("customer1 has profile", !!customer1.profile, true);
  TestValidator.equals("customer1 has wishlist", !!customer1.wishlist, true);
  TestValidator.equals("customer1 has cart", !!customer1.cart, true);
  TestValidator.equals("customer1 has token", !!customer1.token, true);
  // 4. Validate second customer has required fields
  TestValidator.equals("customer2 has valid id", !!customer2.id, true);
  TestValidator.equals("customer2 has valid email", !!customer2.email, true);
  TestValidator.equals("customer2 has profile", !!customer2.profile, true);
  TestValidator.equals("customer2 has wishlist", !!customer2.wishlist, true);
  TestValidator.equals("customer2 has cart", !!customer2.cart, true);
  TestValidator.equals("customer2 has token", !!customer2.token, true);
  // 5. Verify customers are independent (different IDs)
  TestValidator.notEquals(
    "customer IDs are different",
    customer1.id,
    customer2.id,
  );
  TestValidator.notEquals(
    "customer emails are different",
    customer1.email,
    customer2.email,
  );
  // 6. Verify wishlists are independent (auto-created for each customer)
  TestValidator.notEquals(
    "wishlist IDs are different",
    customer1.wishlist.id,
    customer2.wishlist.id,
  );
  // 7. Verify shopping carts are independent (auto-created for each customer)
  TestValidator.notEquals(
    "cart IDs are different",
    customer1.cart.id,
    customer2.cart.id,
  );
  // 8. Validate token structure for both customers
  TestValidator.equals(
    "customer1 token has access",
    !!customer1.token.access,
    true,
  );
  TestValidator.equals(
    "customer1 token has refresh",
    !!customer1.token.refresh,
    true,
  );
  TestValidator.equals(
    "customer1 token has expired_at",
    !!customer1.token.expired_at,
    true,
  );
  TestValidator.equals(
    "customer1 token has refreshable_until",
    !!customer1.token.refreshable_until,
    true,
  );
  TestValidator.equals(
    "customer2 token has access",
    !!customer2.token.access,
    true,
  );
  TestValidator.equals(
    "customer2 token has refresh",
    !!customer2.token.refresh,
    true,
  );
  TestValidator.equals(
    "customer2 token has expired_at",
    !!customer2.token.expired_at,
    true,
  );
  TestValidator.equals(
    "customer2 token has refreshable_until",
    !!customer2.token.refreshable_until,
    true,
  );
  // 9. Verify tokens are different between customers
  TestValidator.notEquals(
    "customer tokens are different",
    customer1.token.access,
    customer2.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens are different",
    customer1.token.refresh,
    customer2.token.refresh,
  );
}
