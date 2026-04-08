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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator retrieval of active customer account details.
 *
 * Validates that an authenticated administrator can successfully retrieve comprehensive customer account information through the admin endpoint. Verifies that the response contains all required customer data structures including account metadata, profile, addresses, wishlist, cart, orders, reviews, and request history.
 *
 * The test creates an administrator account for authentication and a customer account as the test subject. The administrator then retrieves the customer details using the customer ID, and the response is validated against the expected IEcommerceMallCustomer structure.
 *
 * Security validation ensures that sensitive data like password_hash is excluded from the response. The deleted_at field is verified as null to confirm the account is active.
 *
 * 1. Administrator joins and authenticates to obtain authorization.
 * 2. Customer joins to create a test account with profile data.
 * 3. Administrator retrieves customer details using the customer ID.
 * 4. Validates response structure matches IEcommerceMallCustomer with all nested data.
 * 5. Validates that password_hash is NOT present in response (security requirement).
 */
export async function test_api_customer_admin_retrieval_active_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a test customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Administrator retrieves customer details
  const customer = await api.functional.ecommerceMall.admin.customers.at(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(customer);
  // 4. Validate response structure
  TestValidator.equals("customer ID matches", customer.id, customerAuth.id);
  TestValidator.equals("email matches", customer.email, customerAuth.email);
  TestValidator.equals("deleted_at is null", customer.deletedAt, null);
  TestValidator.equals("profile exists", customer.profile !== null, true);
  TestValidator.equals(
    "shippingAddresses is array",
    Array.isArray(customer.shippingAddresses),
    true,
  );
  TestValidator.equals("wishlist exists", customer.wishlist !== null, true);
  TestValidator.equals("cart exists", customer.cart !== null, true);
  TestValidator.equals("orders is array", Array.isArray(customer.orders), true);
  TestValidator.equals(
    "reviews is array",
    Array.isArray(customer.reviews),
    true,
  );
  TestValidator.equals(
    "cancellationRequests is array",
    Array.isArray(customer.cancellationRequests),
    true,
  );
  TestValidator.equals(
    "refundRequests is array",
    Array.isArray(customer.refundRequests),
    true,
  );
  // 5. Validate profile structure
  TestValidator.equals(
    "profile has display_name",
    customer.profile.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "profile has phone",
    customer.profile.phone !== undefined,
    true,
  );
  // 6. Validate cart structure
  TestValidator.equals("cart has id", customer.cart.id !== undefined, true);
  TestValidator.equals(
    "cart has items array",
    Array.isArray(customer.cart.items),
    true,
  );
  TestValidator.equals(
    "cart has total",
    typeof customer.cart.total === "number",
    true,
  );
  // 7. Security validation - password_hash must NOT be present
  TestValidator.equals(
    "password_hash not in response",
    "password_hash" in customer,
    false,
  );
}
