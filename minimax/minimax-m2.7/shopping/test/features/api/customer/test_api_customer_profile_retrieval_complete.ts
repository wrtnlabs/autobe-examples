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
 * Test retrieving the authenticated customer's own profile with complete nested data.
 *
 * Validates the GET /ecommerceMall/customer/customers/me endpoint by registering a new customer
 * and retrieving their complete profile including nested compositions. The response includes
 * account information (id, email, timestamps), profile details (display_name, phone),
 * and owned compositions (shippingAddresses, cart, wishlist).
 *
 * This test verifies:
 * 1. Customer registration returns valid authorization with JWT tokens
 * 2. Profile retrieval returns complete customer data structure
 * 3. Nested compositions are properly included (cart, wishlist, shippingAddresses)
 * 4. All required fields are present and properly formatted
 * 5. New customers have empty compositions (no addresses, empty cart, empty wishlist)
 *
 * 1. Register new customer with valid email and password via authorize_customer_join
 * 2. Call GET /customer/customers/me with authenticated connection
 * 3. Validate response structure with typia.assert()
 * 4. Validate business logic: ID format, email match, timestamps, null deleted_at, empty compositions
 */
export async function test_api_customer_profile_retrieval_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and get authenticated connection
  const registered = await authorize_customer_join(connection, {});
  typia.assert(registered);
  // Create customer connection with auth token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {};
  customerConnection.headers["Authorization"] =
    `Bearer ${registered.token.access}`;
  // 2. Retrieve own profile
  const profile =
    await api.functional.ecommerceMall.customer.customers.me.at(
      customerConnection,
    );
  // 3. Validate complete response structure with typia
  typia.assert(profile);
  // 4. Validate business logic with TestValidator
  TestValidator.equals(
    "email matches registration",
    profile.email,
    registered.email,
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
  TestValidator.predicate(
    "customer ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    profile.updated_at.length > 0,
  );
  // Validate profile composition
  TestValidator.predicate(
    "profile has display_name",
    profile.profile.display_name.length > 0,
  );
  TestValidator.predicate(
    "profile has phone",
    profile.profile.phone.length > 0,
  );
  TestValidator.predicate(
    "profile has nested customer summary",
    !!profile.profile.customer,
  );
  TestValidator.equals(
    "profile customer email matches",
    profile.profile.customer.email,
    profile.email,
  );
  // Validate shippingAddresses (empty for new customer)
  TestValidator.equals(
    "shippingAddresses is empty array",
    profile.shippingAddresses.length,
    0,
  );
  // Validate cart composition
  TestValidator.predicate("cart has id", !!profile.cart.id);
  TestValidator.predicate(
    "cart has items array",
    Array.isArray(profile.cart.items),
  );
  TestValidator.equals(
    "cart items is empty for new customer",
    profile.cart.items.length,
    0,
  );
  TestValidator.predicate(
    "cart has total",
    typeof profile.cart.total === "number",
  );
  TestValidator.equals("cart total is 0 for empty cart", profile.cart.total, 0);
  TestValidator.predicate(
    "cart has customer reference",
    !!profile.cart.customer,
  );
  // Validate wishlist composition - wishlist uses IInvert type, only id is accessible
  TestValidator.predicate("wishlist has id", !!profile.wishlist.id);
}
